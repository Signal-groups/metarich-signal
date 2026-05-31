"use client"

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function CustomerManagerModal({ onClose, onSaveToGoogle }: any) {
  const [data, setData] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // 1. 붙여넣기(Ctrl+V) 이벤트 핸들러
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        // 이미지 붙여넣기 처리
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            setFileName("Pasted Image (OCR 준비됨)");
            alert("이미지 분석 기능(OCR)은 서버 설정이 필요합니다. 현재는 엑셀/텍스트 붙여넣기를 권장합니다.");
          }
        } 
        // 텍스트/엑셀 표 붙여넣기 처리
        else if (items[i].type === "text/plain") {
          items[i].getAsString((text) => {
            parsePastedText(text);
          });
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // 텍스트 파싱 로직 (엑셀에서 복사한 데이터 처리)
  const parsePastedText = (text: string) => {
    const rows = text.split('\n').map(row => row.split('\t'));
    if (rows.length < 1) return;

    const parsedData = rows.map(row => ({
      name: row[0]?.trim() || "이름없음",
      phone: row[1]?.trim() || "",
      contract_date: row[2]?.trim() || new Date().toISOString().split('T')[0],
      birth: row[3]?.trim() || "",
      source_sheet: "Direct Paste"
    })).filter(item => item.name !== "이름없음");

    setData(prev => [...prev, ...parsedData]);
    setFileName("Pasted Data Added");
  };

  // 2. 파일 업로드 핸들러 (기존 로직 유지)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt: any) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      let allCustomers: any[] = [];

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        jsonData.forEach((row: any) => {
          const name = row['성함'] || row['이름'];
          if (name && name !== "성함") {
            allCustomers.push({
              name: name,
              phone: row['연락처'] || "",
              contract_date: String(row['계약일자'] || ""),
              birth: row['생년월일'] || "",
              source_sheet: sheetName
            });
          }
        });
      });
      setData(allCustomers);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 font-black">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] border-4 border-black overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b-4 border-black flex justify-between items-center bg-[#f8f9fa]">
          <div>
            <h2 className="text-2xl italic uppercase font-black text-black">Multi-Data Sync</h2>
            <p className="text-[10px] text-slate-400">파일 업로드 / Ctrl+V 붙여넣기 지원</p>
          </div>
          <button onClick={onClose} className="bg-black text-white px-6 py-2 rounded-full hover:bg-slate-800 transition-colors">CLOSE</button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          <label 
            className={`relative block border-4 border-dashed rounded-[2rem] p-12 text-center transition-all cursor-pointer group
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) processFile(file);
            }}
          >
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="space-y-4">
              <div className="text-6xl group-hover:bounce transition-transform">📋</div>
              <div className="space-y-1">
                <p className="text-xl text-black font-black">{fileName || "파일을 선택하거나 데이터를 붙여넣으세요"}</p>
                <p className="text-sm text-slate-400 italic">엑셀 파일을 끌어다 놓거나, 표를 복사해서 Ctrl+V 하세요</p>
              </div>
            </div>
          </label>

          {data.length > 0 && (
            <div className="border-2 border-black rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="bg-slate-900 text-white font-black">
                  <tr>
                    <th className="p-3">성함</th>
                    <th className="p-3">연락처</th>
                    <th className="p-3">계약일</th>
                    <th className="p-3">비고</th>
                  </tr>
                </thead>
                <tbody className="text-black bg-white">
                  {data.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-3 font-black text-blue-600">{item.name}</td>
                      <td className="p-3">{item.phone}</td>
                      <td className="p-3 italic">{item.contract_date}</td>
                      <td className="p-3 text-slate-400">{item.source_sheet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t-4 border-black flex gap-3">
          <button onClick={() => setData([])} className="px-6 py-2 border-2 border-black rounded-2xl font-black hover:bg-slate-100">RESET</button>
          <button 
            onClick={() => onSaveToGoogle(data)}
            disabled={data.length === 0}
            className="flex-1 bg-emerald-600 text-white py-6 rounded-2xl font-black text-2xl italic shadow-[0_8px_0_0_rgba(5,150,105,1)] active:translate-y-1 active:shadow-none disabled:opacity-30 transition-all border-2 border-black uppercase"
          >
            Sync {data.length > 0 ? `${data.length} Data` : ''} to Google
          </button>
        </div>
      </div>
    </div>
  );
}