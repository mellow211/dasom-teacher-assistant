export const ATTENDANCE_STATUSES = ["미확인","출석","결석","지각","조퇴","결과"] as const;
export const SUBMISSION_STATUSES = ["미확인","제출","미제출","늦게 제출","재제출 필요"] as const;
export const ASSIGNMENT_STATUSES = ["진행 중","마감","보관"] as const;
export const DUE_SOON_DAYS = 3;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];
export type SubmissionStatus = typeof SUBMISSION_STATUSES[number];
export type AssignmentStatus = typeof ASSIGNMENT_STATUSES[number];
export type ClassRoom={id:string;schoolYear:number;grade:number;classNumber:number;name?:string};
export type Student={id:string;classId:string;studentNumber:number;displayName:string;isActive:boolean};
export type AttendanceRecord={id?:string;classId:string;studentId:string;attendanceDate:string;status:AttendanceStatus;note:string};
export type Assignment={id:string;classId:string;title:string;subject:string;description:string;assignedDate:string;dueDate:string;status:AssignmentStatus};
export type SubmissionRecord={id?:string;assignmentId:string;studentId:string;status:SubmissionStatus;note:string};

export const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function moveDate(value:string,days:number){const [year,month,date]=value.split("-").map(Number);const moved=new Date(year,month-1,date+days);return localDate(moved);}
export function activeStudents(students:Student[],classId:string){return students.filter(s=>s.classId===classId&&s.isActive).sort((a,b)=>a.studentNumber-b.studentNumber);}
export function attendanceForDate(students:Student[],records:AttendanceRecord[],classId:string,date:string){return activeStudents(students,classId).map(student=>records.find(r=>r.classId===classId&&r.studentId===student.id&&r.attendanceDate===date)??{classId,studentId:student.id,attendanceDate:date,status:"미확인" as const,note:""});}
export function attendanceSummary(records:AttendanceRecord[]){return ATTENDANCE_STATUSES.reduce<Record<AttendanceStatus,number>>((sum,status)=>({...sum,[status]:records.filter(r=>r.status===status).length}),{} as Record<AttendanceStatus,number>);}
export function submissionForAssignment(students:Student[],records:SubmissionRecord[],assignment:Assignment){return activeStudents(students,assignment.classId).map(student=>records.find(r=>r.assignmentId===assignment.id&&r.studentId===student.id)??{assignmentId:assignment.id,studentId:student.id,status:"미확인" as const,note:""});}
export function submissionSummary(records:SubmissionRecord[]){return SUBMISSION_STATUSES.reduce<Record<SubmissionStatus,number>>((sum,status)=>({...sum,[status]:records.filter(r=>r.status===status).length}),{} as Record<SubmissionStatus,number>);}
export function upsertAttendance(records:AttendanceRecord[],updates:AttendanceRecord[]){const map=new Map(records.map(r=>[`${r.classId}:${r.studentId}:${r.attendanceDate}`,r]));updates.forEach(r=>map.set(`${r.classId}:${r.studentId}:${r.attendanceDate}`,r));return [...map.values()];}
export function upsertSubmissions(records:SubmissionRecord[],updates:SubmissionRecord[]){const map=new Map(records.map(r=>[`${r.assignmentId}:${r.studentId}`,r]));updates.forEach(r=>map.set(`${r.assignmentId}:${r.studentId}`,r));return [...map.values()];}
export function dueSoon(assignment:Assignment,today=localDate()){const distance=(new Date(`${assignment.dueDate}T00:00:00`).getTime()-new Date(`${today}T00:00:00`).getTime())/86400000;return assignment.status==="진행 중"&&distance>=0&&distance<=DUE_SOON_DAYS;}
