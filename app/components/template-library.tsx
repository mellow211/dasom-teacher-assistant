"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Copy, FileText, LoaderCircle, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { TEMPLATE_GRADES, TEMPLATE_SCOPES, TEMPLATE_SUBJECTS, TEMPLATE_TYPES, type TeacherTemplate, type TeacherTemplateInput } from "../lib/template-store";

const blankTemplate: TeacherTemplateInput = { title: "", description: "", scope: "수업 자료", resourceType: "활동지", grade: "공통", subject: "공통", content: "" };
type Tab = "전체" | "최근 사용" | "수업 자료" | "업무 양식" | "즐겨찾기";

export function TemplateLibrary() {
  const [templates, setTemplates] = useState<TeacherTemplate[]>([]);
  const [active, setActive] = useState<Tab>("전체");
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("전체 학년");
  const [subject, setSubject] = useState("전체 교과");
  const [type, setType] = useState("전체 유형");
  const [selected, setSelected] = useState<TeacherTemplate | null>(null);
  const [draft, setDraft] = useState<TeacherTemplateInput>(blankTemplate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let activeRequest = true;
    fetch("/api/templates", { cache: "no-store" }).then(async response => {
      const payload = await response.json() as { templates?: TeacherTemplate[]; error?: string };
      if (!response.ok || !payload.templates) throw new Error(payload.error || "자료를 불러오지 못했습니다.");
      if (activeRequest) setTemplates(payload.templates);
    }).catch((reason: unknown) => { if (activeRequest) setError(reason instanceof Error ? reason.message : "자료를 불러오지 못했습니다."); }).finally(() => { if (activeRequest) setLoading(false); });
    return () => { activeRequest = false; };
  }, []);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = templates.filter(template => {
      if (active === "수업 자료" && template.scope !== "수업 자료") return false;
      if (active === "업무 양식" && template.scope !== "업무 양식") return false;
      if (active === "즐겨찾기" && !template.isFavorite) return false;
      if (active === "최근 사용" && !template.lastUsedAt) return false;
      if (grade !== "전체 학년" && template.grade !== grade) return false;
      if (subject !== "전체 교과" && template.subject !== subject) return false;
      if (type !== "전체 유형" && template.resourceType !== type) return false;
      if (normalized && ![template.title, template.description, template.subject, template.grade, template.resourceType, template.content].some(value => value.toLowerCase().includes(normalized))) return false;
      return true;
    });
    return active === "최근 사용" ? rows.sort((a, b) => (b.lastUsedAt || "").localeCompare(a.lastUsedAt || "")) : rows;
  }, [active, grade, query, subject, templates, type]);

  const updateDraft = <K extends keyof TeacherTemplateInput>(key: K, value: TeacherTemplateInput[K]) => setDraft(current => ({ ...current, [key]: value }));
  const openNew = () => { setDraft(blankTemplate); setEditingId(null); setError(""); setShowEditor(true); };
  const openEdit = (template: TeacherTemplate) => { setDraft({ title: template.title, description: template.description, scope: template.scope, resourceType: template.resourceType, grade: template.grade, subject: template.subject, content: template.content }); setEditingId(template.id); setSelected(null); setError(""); setShowEditor(true); };

  const save = async () => {
    if (!draft.title.trim()) return setError("템플릿 이름을 입력해 주세요.");
    if (!draft.content.trim()) return setError("다시 사용할 내용을 입력해 주세요.");
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/templates", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? { id: editingId, ...draft } : draft) });
      const payload = await response.json() as { template?: TeacherTemplate; error?: string };
      if (!response.ok || !payload.template) throw new Error(payload.error || "템플릿을 저장하지 못했습니다.");
      setTemplates(current => [payload.template!, ...current.filter(item => item.id !== payload.template!.id)]);
      setShowEditor(false); setNotice(editingId ? "변경 내용을 저장했어요." : "새 템플릿을 저장했어요.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "템플릿을 저장하지 못했습니다."); }
    finally { setSaving(false); }
  };

  const favorite = async (template: TeacherTemplate) => {
    try {
      const response = await fetch("/api/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: template.id, action: "favorite", isFavorite: !template.isFavorite }) });
      const payload = await response.json() as { template?: TeacherTemplate; error?: string };
      if (!response.ok || !payload.template) throw new Error(payload.error || "즐겨찾기를 변경하지 못했습니다.");
      setTemplates(current => current.map(item => item.id === template.id ? payload.template! : item));
      if (selected?.id === template.id) setSelected(payload.template);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "즐겨찾기를 변경하지 못했습니다."); }
  };

  const copyTemplateForUse = async (template: TeacherTemplate) => {
    setError(""); setNotice("");
    try {
      await navigator.clipboard.writeText(template.content);
      const response = await fetch("/api/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: template.id, action: "use", useCount: template.useCount }) });
      const payload = await response.json() as { template?: TeacherTemplate; error?: string };
      if (!response.ok || !payload.template) throw new Error(payload.error || "사용 기록을 반영하지 못했습니다.");
      setTemplates(current => current.map(item => item.id === template.id ? payload.template! : item));
      setSelected(payload.template); setNotice("템플릿 내용을 복사했어요. 필요한 곳에 붙여 넣어 사용하세요.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "내용을 복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요."); }
  };

  const remove = async (template: TeacherTemplate) => {
    if (!window.confirm(`‘${template.title}’ 템플릿을 삭제할까요? 삭제한 자료는 복구할 수 없습니다.`)) return;
    try {
      const response = await fetch("/api/templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: template.id }) });
      if (!response.ok) { const payload = await response.json().catch(() => ({})) as { error?: string }; throw new Error(payload.error || "템플릿을 삭제하지 못했습니다."); }
      setTemplates(current => current.filter(item => item.id !== template.id)); setSelected(null); setNotice("템플릿을 삭제했어요.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "템플릿을 삭제하지 못했습니다."); }
  };

  return <>
    <div className="section-heading compact"><div><h2>문구·양식 템플릿</h2><p>반복해서 쓰는 문구와 서식을 저장해 두고, 복사해서 다른 곳에 바로 붙여 넣으세요.</p></div><button className="primary-btn" onClick={openNew}><Plus size={17}/> 새 템플릿</button></div>
    {notice && <div className="template-notice" role="status"><Check size={16}/>{notice}</div>}
    {error && !showEditor && <div className="template-error" role="alert">{error}<button onClick={()=>setError("")} aria-label="오류 안내 닫기"><X size={15}/></button></div>}
    <div className="library-search"><div className="search-box"><Search size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="템플릿 이름이나 내용을 검색하세요" aria-label="템플릿 검색"/></div><select value={grade} onChange={event=>setGrade(event.target.value)}><option>전체 학년</option>{TEMPLATE_GRADES.map(item=><option key={item}>{item}</option>)}</select><select value={subject} onChange={event=>setSubject(event.target.value)}><option>전체 교과</option>{TEMPLATE_SUBJECTS.map(item=><option key={item}>{item}</option>)}</select><select value={type} onChange={event=>setType(event.target.value)}><option>전체 유형</option>{TEMPLATE_TYPES.map(item=><option key={item}>{item}</option>)}</select></div>
    <div className="tabs template-tabs">{(["전체","최근 사용","수업 자료","업무 양식","즐겨찾기"] as Tab[]).map(item=><button className={active===item?"active":""} onClick={()=>setActive(item)} key={item}>{item}{item==="즐겨찾기"&&templates.some(template=>template.isFavorite)?` ${templates.filter(template=>template.isFavorite).length}`:""}</button>)}</div>
    {loading ? <div className="template-loading"><LoaderCircle className="spin"/><p>저장한 자료를 불러오고 있어요.</p></div> : visible.length ? <div className="template-grid">{visible.map((template,index)=><article className="template-card usable" key={template.id}><button className={`template-thumb thumb-${index%6}`} onClick={()=>setSelected(template)} aria-label={`${template.title} 미리보기`}><span>{template.scope}</span><FileText size={35}/><div className="mock-lines"><i/><i/><i/></div></button><button type="button" className={`template-star ${template.isFavorite?"active":""}`} onClick={()=>favorite(template)} aria-label={template.isFavorite?"즐겨찾기 해제":"즐겨찾기 추가"}><Star size={17} fill={template.isFavorite?"currentColor":"none"}/></button><div><span className="subject-badge">{template.resourceType}</span><h3>{template.title}</h3><p>{template.grade} · {template.subject}{template.description?` · ${template.description}`:""}</p><small><Copy size={13}/>{template.useCount}회 사용</small><div className="template-card-actions"><button onClick={()=>setSelected(template)}>내용 보기</button><button onClick={()=>copyTemplateForUse(template)}>복사해서 사용</button></div></div></article>)}</div> : <section className="template-empty"><span><Clipboard size={28}/></span><h2>{templates.length ? "조건에 맞는 템플릿이 없어요" : "아직 저장한 템플릿이 없어요"}</h2><p>{templates.length ? "검색어나 필터를 바꾸어 다시 찾아보세요." : "반복해서 쓰는 안내문, 지도안, 활동지 내용을 저장해 두면 어느 기기에서든 다시 사용할 수 있어요."}</p>{!templates.length&&<button className="primary-btn" onClick={openNew}><Plus size={16}/> 첫 템플릿 만들기</button>}</section>}
    {selected && <div className="template-modal" role="dialog" aria-modal="true" aria-labelledby="template-preview-title"><section><button className="template-modal-close" onClick={()=>setSelected(null)} aria-label="미리보기 닫기"><X/></button><span className="eyebrow">{selected.scope} · {selected.resourceType}</span><h2 id="template-preview-title">{selected.title}</h2><p className="template-meta">{selected.grade} · {selected.subject}{selected.description?` · ${selected.description}`:""}</p><textarea value={selected.content} readOnly aria-label="템플릿 내용"/><div className="template-modal-actions"><button className="danger-outline" onClick={()=>remove(selected)}><Trash2 size={16}/>삭제</button><button className="outline-btn" onClick={()=>openEdit(selected)}><Pencil size={16}/>수정</button><button className="primary-btn" onClick={()=>copyTemplateForUse(selected)}><Copy size={16}/>복사해서 사용</button></div></section></div>}
    {showEditor && <div className="template-modal" role="dialog" aria-modal="true" aria-labelledby="template-editor-title"><section className="template-editor"><button className="template-modal-close" onClick={()=>setShowEditor(false)} aria-label="편집 창 닫기"><X/></button><span className="eyebrow">MY TEMPLATE</span><h2 id="template-editor-title">{editingId?"템플릿 수정":"새 템플릿 만들기"}</h2><p>자주 다시 사용할 내용과 찾기 쉬운 분류 정보를 입력해 주세요.</p><div className="template-editor-grid"><label>템플릿 이름 *<input value={draft.title} maxLength={100} onChange={event=>updateDraft("title",event.target.value)} placeholder="예: 현장체험학습 준비물 안내"/></label><label>간단한 설명<input value={draft.description} maxLength={300} onChange={event=>updateDraft("description",event.target.value)} placeholder="언제 사용하는 자료인지 적어 주세요"/></label><label>자료 구분<select value={draft.scope} onChange={event=>updateDraft("scope",event.target.value as TeacherTemplateInput["scope"])}>{TEMPLATE_SCOPES.map(item=><option key={item}>{item}</option>)}</select></label><label>자료 유형<select value={draft.resourceType} onChange={event=>updateDraft("resourceType",event.target.value as TeacherTemplateInput["resourceType"])}>{TEMPLATE_TYPES.map(item=><option key={item}>{item}</option>)}</select></label><label>학년<select value={draft.grade} onChange={event=>updateDraft("grade",event.target.value)}>{TEMPLATE_GRADES.map(item=><option key={item}>{item}</option>)}</select></label><label>교과·영역<select value={draft.subject} onChange={event=>updateDraft("subject",event.target.value)}>{TEMPLATE_SUBJECTS.map(item=><option key={item}>{item}</option>)}</select></label><label className="template-content-field">다시 사용할 내용 *<textarea value={draft.content} maxLength={30000} onChange={event=>updateDraft("content",event.target.value)} placeholder="반복해서 사용할 문구, 양식, 수업 자료 내용을 입력하세요."/></label></div>{error&&<div className="template-form-error" role="alert">{error}</div>}<div className="template-modal-actions"><button className="outline-btn" onClick={()=>setShowEditor(false)}>취소</button><button className="primary-btn" onClick={save} disabled={saving}>{saving?<><LoaderCircle className="spin" size={16}/>저장 중</>:<><Check size={16}/>저장하기</>}</button></div></section></div>}
  </>;
}
