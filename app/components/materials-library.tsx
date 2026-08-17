"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Check, Download, FileSpreadsheet, FileText, Image as ImageIcon, LoaderCircle, Pencil, Plus, Presentation, Search, Star, Trash2, Upload, X } from "lucide-react";
import { MATERIAL_ALLOWED_EXTENSIONS, MATERIAL_CATEGORIES, MATERIAL_GRADES, MATERIAL_MAX_BYTES, MATERIAL_SUBJECTS, type MaterialCategory, type TeacherMaterial, type TeacherMaterialMeta } from "../lib/material-store";

const blankMeta: TeacherMaterialMeta = { title: "", description: "", category: "수업 자료", grade: "공통", subject: "공통" };
type Tab = "전체" | "즐겨찾기" | "최근 업로드";

function extOf(fileName: string) { return fileName.slice(fileName.lastIndexOf(".")).toLowerCase(); }
function iconFor(fileName: string) {
  const ext = extOf(fileName);
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) return <ImageIcon size={26}/>;
  if ([".xls", ".xlsx", ".csv"].includes(ext)) return <FileSpreadsheet size={26}/>;
  if ([".ppt", ".pptx"].includes(ext)) return <Presentation size={26}/>;
  if (ext === ".zip") return <Archive size={26}/>;
  return <FileText size={26}/>;
}
function formatSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`; }

export function MaterialsLibrary() {
  const [materials, setMaterials] = useState<TeacherMaterial[]>([]);
  const [active, setActive] = useState<Tab>("전체");
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("전체 학년");
  const [subject, setSubject] = useState("전체 교과");
  const [category, setCategory] = useState("전체 분류");
  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [meta, setMeta] = useState<TeacherMaterialMeta>(blankMeta);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let activeRequest = true;
    fetch("/api/materials", { cache: "no-store" }).then(async response => {
      const payload = await response.json() as { materials?: TeacherMaterial[]; error?: string };
      if (!response.ok || !payload.materials) throw new Error(payload.error || "자료를 불러오지 못했습니다.");
      if (activeRequest) setMaterials(payload.materials);
    }).catch((reason: unknown) => { if (activeRequest) setError(reason instanceof Error ? reason.message : "자료를 불러오지 못했습니다."); }).finally(() => { if (activeRequest) setLoading(false); });
    return () => { activeRequest = false; };
  }, []);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = materials.filter(m => {
      if (active === "즐겨찾기" && !m.isFavorite) return false;
      if (grade !== "전체 학년" && m.grade !== grade) return false;
      if (subject !== "전체 교과" && m.subject !== subject) return false;
      if (category !== "전체 분류" && m.category !== category) return false;
      if (normalized && ![m.title, m.description, m.fileName, m.subject, m.grade].some(v => v.toLowerCase().includes(normalized))) return false;
      return true;
    });
    return active === "최근 업로드" ? [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 20) : rows;
  }, [active, category, grade, materials, query, subject]);

  const updateMeta = <K extends keyof TeacherMaterialMeta>(key: K, value: TeacherMaterialMeta[K]) => setMeta(current => ({ ...current, [key]: value }));
  const openUpload = () => { setMeta(blankMeta); setFile(null); setEditingId(null); setError(""); setShowUpload(true); };
  const openEdit = (m: TeacherMaterial) => { setMeta({ title: m.title, description: m.description, category: m.category, grade: m.grade, subject: m.subject }); setFile(null); setEditingId(m.id); setError(""); setShowUpload(true); };
  const pickFile = (picked: File | null) => {
    setFile(null); setError("");
    if (!picked) return;
    if (picked.size > MATERIAL_MAX_BYTES) return setError("파일은 4MB 이하만 올릴 수 있습니다.");
    const ext = extOf(picked.name);
    if (!MATERIAL_ALLOWED_EXTENSIONS.includes(ext)) return setError("지원하지 않는 파일 형식입니다. (문서·표·이미지·압축 파일만 가능)");
    setFile(picked);
  };

  const save = async () => {
    if (!meta.title.trim()) return setError("자료 이름을 입력해 주세요.");
    if (!editingId && !file) return setError("올릴 파일을 선택해 주세요.");
    setSaving(true); setError(""); setNotice("");
    try {
      if (editingId) {
        const response = await fetch("/api/materials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...meta }) });
        const payload = await response.json() as { material?: TeacherMaterial; error?: string };
        if (!response.ok || !payload.material) throw new Error(payload.error || "자료 정보를 저장하지 못했습니다.");
        setMaterials(current => current.map(item => item.id === payload.material!.id ? payload.material! : item));
        setNotice("자료 정보를 저장했어요.");
      } else {
        const form = new FormData();
        form.set("file", file!); form.set("title", meta.title); form.set("description", meta.description); form.set("category", meta.category); form.set("grade", meta.grade); form.set("subject", meta.subject);
        const response = await fetch("/api/materials", { method: "POST", body: form });
        const payload = await response.json() as { material?: TeacherMaterial; error?: string };
        if (!response.ok || !payload.material) throw new Error(payload.error || "자료를 올리지 못했습니다.");
        setMaterials(current => [payload.material!, ...current]);
        setNotice("자료를 올렸어요.");
      }
      setShowUpload(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "저장하지 못했습니다."); }
    finally { setSaving(false); }
  };

  const favorite = async (m: TeacherMaterial) => {
    try {
      const response = await fetch("/api/materials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, action: "favorite", isFavorite: !m.isFavorite }) });
      const payload = await response.json() as { material?: TeacherMaterial; error?: string };
      if (!response.ok || !payload.material) throw new Error(payload.error || "즐겨찾기를 변경하지 못했습니다.");
      setMaterials(current => current.map(item => item.id === m.id ? payload.material! : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "즐겨찾기를 변경하지 못했습니다."); }
  };

  const remove = async (m: TeacherMaterial) => {
    if (!window.confirm(`'${m.title}' 자료를 삭제할까요? 삭제한 파일은 복구할 수 없습니다.`)) return;
    try {
      const response = await fetch("/api/materials", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id }) });
      if (!response.ok) { const payload = await response.json().catch(() => ({})) as { error?: string }; throw new Error(payload.error || "자료를 삭제하지 못했습니다."); }
      setMaterials(current => current.filter(item => item.id !== m.id)); setNotice("자료를 삭제했어요.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "자료를 삭제하지 못했습니다."); }
  };

  return <>
    <div className="section-heading compact"><div><h2>자료함</h2><p>내가 가진 파일을 올려두고 어느 기기에서든 다시 꺼내 쓰세요. (파일당 최대 4MB)</p></div><button className="primary-btn" onClick={openUpload}><Upload size={17}/> 자료 올리기</button></div>
    {notice && <div className="template-notice" role="status"><Check size={16}/>{notice}</div>}
    {error && !showUpload && <div className="template-error" role="alert">{error}<button onClick={() => setError("")} aria-label="오류 안내 닫기"><X size={15}/></button></div>}
    <div className="library-search"><div className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="자료 이름이나 파일명을 검색하세요" aria-label="자료 검색"/></div><select value={grade} onChange={e => setGrade(e.target.value)}><option>전체 학년</option>{MATERIAL_GRADES.map(v => <option key={v}>{v}</option>)}</select><select value={subject} onChange={e => setSubject(e.target.value)}><option>전체 교과</option>{MATERIAL_SUBJECTS.map(v => <option key={v}>{v}</option>)}</select><select value={category} onChange={e => setCategory(e.target.value)}><option>전체 분류</option>{MATERIAL_CATEGORIES.map(v => <option key={v}>{v}</option>)}</select></div>
    <div className="tabs template-tabs">{(["전체", "즐겨찾기", "최근 업로드"] as Tab[]).map(item => <button className={active === item ? "active" : ""} onClick={() => setActive(item)} key={item}>{item}{item === "즐겨찾기" && materials.some(m => m.isFavorite) ? ` ${materials.filter(m => m.isFavorite).length}` : ""}</button>)}</div>
    {loading ? <div className="template-loading"><LoaderCircle className="spin"/><p>저장한 자료를 불러오고 있어요.</p></div> : visible.length ? <div className="material-grid">{visible.map(m => <article className="material-card" key={m.id}>
      <div className="material-icon">{iconFor(m.fileName)}</div>
      <button type="button" className={`template-star ${m.isFavorite ? "active" : ""}`} onClick={() => favorite(m)} aria-label={m.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}><Star size={17} fill={m.isFavorite ? "currentColor" : "none"}/></button>
      <div><span className="subject-badge">{m.category}</span><h3>{m.title}</h3><p>{m.grade} · {m.subject}{m.description ? ` · ${m.description}` : ""}</p><small>{m.fileName} · {formatSize(m.fileSize)} · 다운로드 {m.downloadCount}회</small>
      <div className="template-card-actions material-card-actions"><button onClick={() => openEdit(m)}><Pencil size={13}/>정보 수정</button><a className="material-download" href={`/api/materials/${m.id}`}><Download size={13}/>다운로드</a><button className="material-delete" onClick={() => remove(m)} aria-label="삭제"><Trash2 size={14}/></button></div>
      </div>
    </article>)}</div> : <section className="template-empty"><span><Upload size={28}/></span><h2>{materials.length ? "조건에 맞는 자료가 없어요" : "아직 올린 자료가 없어요"}</h2><p>{materials.length ? "검색어나 필터를 바꾸어 다시 찾아보세요." : "자주 쓰는 활동지, 안내문 양식, 사진 등을 올려두면 다른 기기에서도 바로 내려받아 쓸 수 있어요."}</p>{!materials.length && <button className="primary-btn" onClick={openUpload}><Plus size={16}/> 첫 자료 올리기</button>}</section>}
    {showUpload && <div className="template-modal" role="dialog" aria-modal="true" aria-labelledby="material-editor-title"><section className="template-editor"><button className="template-modal-close" onClick={() => setShowUpload(false)} aria-label="닫기"><X/></button><span className="eyebrow">MY MATERIALS</span><h2 id="material-editor-title">{editingId ? "자료 정보 수정" : "새 자료 올리기"}</h2><p>{editingId ? "파일은 그대로 두고 이름과 분류만 수정합니다. 파일을 바꾸려면 삭제 후 다시 올려 주세요." : "찾기 쉬운 이름과 분류를 입력하고 파일을 선택해 주세요. (최대 4MB)"}</p>
      <div className="template-editor-grid">
        <label>자료 이름 *<input value={meta.title} maxLength={150} onChange={e => updateMeta("title", e.target.value)} placeholder="예: 2학기 학부모 상담 안내문"/></label>
        <label>간단한 설명<input value={meta.description} maxLength={300} onChange={e => updateMeta("description", e.target.value)} placeholder="언제 사용하는 자료인지 적어 주세요"/></label>
        <label>분류<select value={meta.category} onChange={e => updateMeta("category", e.target.value as MaterialCategory)}>{MATERIAL_CATEGORIES.map(v => <option key={v}>{v}</option>)}</select></label>
        <label>학년<select value={meta.grade} onChange={e => updateMeta("grade", e.target.value)}>{MATERIAL_GRADES.map(v => <option key={v}>{v}</option>)}</select></label>
        <label>교과·영역<select value={meta.subject} onChange={e => updateMeta("subject", e.target.value)}>{MATERIAL_SUBJECTS.map(v => <option key={v}>{v}</option>)}</select></label>
        {!editingId && <label className="template-content-field">파일 선택 *<input ref={fileInput} type="file" accept={MATERIAL_ALLOWED_EXTENSIONS.join(",")} onChange={e => pickFile(e.target.files?.[0] || null)}/>{file && <small className="material-picked">{file.name} · {formatSize(file.size)}</small>}</label>}
      </div>
      {error && <div className="template-form-error" role="alert">{error}</div>}
      <div className="template-modal-actions"><button className="outline-btn" onClick={() => setShowUpload(false)}>취소</button><button className="primary-btn" onClick={save} disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16}/>저장 중</> : <><Check size={16}/>저장하기</>}</button></div>
    </section></div>}
  </>;
}
