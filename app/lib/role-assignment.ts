import type { Student } from "./attendance-assignment";

export type ClassRole={id:string;classId:string;name:string;description:string;capacity:number;displayOrder:number;isActive:boolean};
export type RoleCycle={id:string;classId:string;name:string;startDate:string;endDate:string;note:string;status:"draft"|"confirmed";updatedAt?:string};
export type RolePreference={cycleId?:string;studentId:string;firstChoiceRoleId?:string;secondChoiceRoleId?:string;thirdChoiceRoleId?:string;excludedRoleIds:string[];note:string;lockedRoleId?:string};
export type RoleAssignment={studentId:string;roleId:string;isLocked:boolean;assignmentSource:"auto"|"manual"|"fixed"};
export type RoleHistory={studentId:string;roleId:string;cycleStartDate:string};
export type AllocationFailure={studentIds:string[];messages:string[]};
export type AllocationResult={ok:true;assignments:RoleAssignment[]}|{ok:false;failure:AllocationFailure};
export type RandomSource=()=>number;

export function seededRandom(seed:number):RandomSource{return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function capacityDelta(roles:ClassRole[],studentCount:number){return roles.filter(r=>r.isActive).reduce((n,r)=>n+r.capacity,0)-studentCount;}
export function duplicateChoices(p:RolePreference){const choices=[p.firstChoiceRoleId,p.secondChoiceRoleId,p.thirdChoiceRoleId].filter(Boolean);return new Set(choices).size!==choices.length;}
export function periodOverlaps(startDate:string,endDate:string,cycles:RoleCycle[],excludeId?:string){return cycles.some(c=>c.id!==excludeId&&startDate<=c.endDate&&endDate>=c.startDate);}

export function allocateRoles(input:{students:Student[];roles:ClassRole[];preferences:RolePreference[];history:RoleHistory[];random?:RandomSource}):AllocationResult{
 const {students,preferences,history}=input,roles=input.roles.filter(r=>r.isActive&&r.capacity>0),random=input.random??Math.random;
 const delta=capacityDelta(roles,students.length);if(delta!==0)return{ok:false,failure:{studentIds:[],messages:[delta<0?`역할 정원이 ${-delta}자리 부족합니다.`:`역할 정원이 ${delta}자리 남습니다.`]}};
 const pref=new Map(preferences.map(p=>[p.studentId,p])),roleMap=new Map(roles.map(r=>[r.id,r])),remaining=new Map(roles.map(r=>[r.id,r.capacity])),assigned=new Map<string,RoleAssignment>();
 for(const student of students){const p=pref.get(student.id);if(!p?.lockedRoleId)continue;const role=roleMap.get(p.lockedRoleId);if(!role||p.excludedRoleIds.includes(role.id))return{ok:false,failure:{studentIds:[student.id],messages:["고정 역할이 비활성 상태이거나 제외 역할과 충돌합니다."]}};const left=(remaining.get(role.id)??0)-1;if(left<0)return{ok:false,failure:{studentIds:[student.id],messages:[`${role.name} 역할의 고정 배정이 정원을 초과합니다.`]}};remaining.set(role.id,left);assigned.set(student.id,{studentId:student.id,roleId:role.id,isLocked:true,assignmentSource:"fixed"});}
 const candidates=(student:Student)=>roles.filter(r=>(remaining.get(r.id)??0)>0&&!pref.get(student.id)?.excludedRoleIds.includes(r.id));
 const pending=students.filter(s=>!assigned.has(s.id)).sort((a,b)=>candidates(a).length-candidates(b).length||random()-.5);
 const score=(student:Student,role:ClassRole)=>{const p=pref.get(student.id),choices=[p?.firstChoiceRoleId,p?.secondChoiceRoleId,p?.thirdChoiceRoleId],recent=history.filter(h=>h.studentId===student.id).sort((a,b)=>b.cycleStartDate.localeCompare(a.cycleStartDate));let value=choices[0]===role.id?300:choices[1]===role.id?180:choices[2]===role.id?100:0;if(recent[0]?.roleId===role.id)value-=220;value-=recent.filter(h=>h.roleId===role.id).length*45;return value+random();};
 const search=(index:number):boolean=>{if(index===pending.length)return true;const student=pending[index],options=candidates(student).sort((a,b)=>score(student,b)-score(student,a));for(const role of options){remaining.set(role.id,(remaining.get(role.id)??0)-1);assigned.set(student.id,{studentId:student.id,roleId:role.id,isLocked:false,assignmentSource:"auto"});if(search(index+1))return true;assigned.delete(student.id);remaining.set(role.id,(remaining.get(role.id)??0)+1);}return false;};
 if(!search(0)){const blocked=pending.filter(s=>candidates(s).length===0).map(s=>s.id);return{ok:false,failure:{studentIds:blocked.length?blocked:pending.map(s=>s.id),messages:["제외 조건과 고정 배정 때문에 모든 학생을 배정할 수 없습니다.","제외 역할을 줄이거나 고정 배정을 조정해 주세요."]}};}
 return{ok:true,assignments:students.map(s=>assigned.get(s.id)!).filter(Boolean)};
}

export function validateAssignments(students:Student[],roles:ClassRole[],preferences:RolePreference[],assignments:RoleAssignment[]){const errors:string[]=[];if(new Set(assignments.map(a=>a.studentId)).size!==students.length||assignments.length!==students.length)errors.push("모든 학생에게 역할이 하나씩 배정되어야 합니다.");const pref=new Map(preferences.map(p=>[p.studentId,p]));for(const a of assignments)if(pref.get(a.studentId)?.excludedRoleIds.includes(a.roleId))errors.push("배정 제외 역할을 받은 학생이 있습니다.");for(const role of roles.filter(r=>r.isActive)){const count=assignments.filter(a=>a.roleId===role.id).length;if(count!==role.capacity)errors.push(`${role.name} 역할은 ${role.capacity}명이 배정되어야 합니다.`);}return[...new Set(errors)];}

export function canSwap(a:RoleAssignment,b:RoleAssignment,preferences:RolePreference[]){const pref=new Map(preferences.map(p=>[p.studentId,p]));return!pref.get(a.studentId)?.excludedRoleIds.includes(b.roleId)&&!pref.get(b.studentId)?.excludedRoleIds.includes(a.roleId);}
