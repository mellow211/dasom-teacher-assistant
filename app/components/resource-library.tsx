"use client";

import { useState } from "react";
import { MaterialsLibrary } from "./materials-library";
import { TemplateLibrary } from "./template-library";

type ResourceTab = "materials" | "templates";

export function ResourceLibrary() {
  const [tab, setTab] = useState<ResourceTab>("materials");
  return <>
    <div className="page-title"><div><span className="eyebrow">LIBRARY</span><h1>자료·템플릿 보관함</h1><p>내가 가진 파일은 자료함에 올려 두고, 반복해서 쓰는 문구는 템플릿으로 저장하세요.</p></div></div>
    <div className="resource-tabs">
      <button className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")}><b>자료함</b><small>내가 가진 파일을 올려두고 어디서든 다시 꺼내 써요</small></button>
      <button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}><b>문구·양식 템플릿</b><small>반복해서 쓰는 문구와 서식을 복사해서 사용해요</small></button>
    </div>
    {tab === "materials" ? <MaterialsLibrary/> : <TemplateLibrary/>}
  </>;
}
