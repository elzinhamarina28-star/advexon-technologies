import { useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, RotateCcw, ShieldCheck, Check, Download, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { questions } from './questions';
import { categories, type Answers } from './score';
import { recommend } from './recommendations';
export function Diagnostic() {
 const [step,setStep]=useState(0); const [answers,setAnswers]=useState<Answers>({}); const [finished,setFinished]=useState(false); const [receipt,setReceipt]=useState(false); const heading=useRef<HTMLHeadingElement>(null);
 const question=questions[step];
 if (!question) return null;
 const selected=answers[question.id]??[];
 const reset=()=>{setStep(0);setAnswers({});setFinished(false);setReceipt(false);};
 const focusQuestion=()=>requestAnimationFrame(()=>heading.current?.focus());
 const choose=(index:number)=>setAnswers(current=>({...current,[question.id]:question.multiple?(selected.includes(index)?selected.filter(i=>i!==index):[...selected,index]):[index]}));
 const next=()=>{if(!selected.length)return;if(step===questions.length-1){setFinished(true);}else{setStep(step+1);}focusQuestion();};
 const result=finished?recommend(answers):null;
 function downloadReport(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault(); if(!result)return;
  const data=new FormData(event.currentTarget); const report=`NEXAOP — Diagnóstico completo\n\nNome: ${data.get('name')}\nEmpresa: ${data.get('company')}\nE-mail: ${data.get('email')}\n\nSeu NEXAOP Score: ${result.score}/100\n${result.classification}\n\n${categories.map(c=>`${c}: ${result.categories[c]}/100`).join('\n')}\n\nPrincipais pontos:\n${result.findings.map(f=>`• ${f}`).join('\n')}\n\nOnde a IA pode ajudar: ${result.help}\nPrimeiro funcionário IA recomendado: ${result.firstAgent}\nMaior potencial de ganho: ${result.potential}\n\nEste resultado é uma orientação baseada nas respostas fornecidas e não representa garantia de desempenho futuro.\n\nRespostas:\n${questions.map(q=>`${q.title}\n${(answers[q.id]??[]).map(i=>q.options[i]).join(', ')}`).join('\n\n')}`;
  const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='diagnostico-nexaop.txt';link.click();URL.revokeObjectURL(url);setReceipt(true);
 }
 return <section id="diagnostico" className="section diagnostic-section"><div className={`container diagnostic-layout ${finished?'result-layout':''}`}>
  <div className="diagnostic-intro"><div className="eyebrow"><Sparkles size={14}/>DIAGNÓSTICO NEXAOP</div><h2 className="section-title">O próximo passo começa com <span className="gradient-text">clareza.</span></h2><p className="section-copy">Entenda o momento da sua operação e descubra onde a IA pode fazer sentido para o seu negócio.</p><ul className="diagnostic-benefits"><li><CheckCircle2/>12 perguntas sobre a sua empresa</li><li><CheckCircle2/>Um diagnóstico feito para o seu momento</li><li><CheckCircle2/>Resultado gratuito, sem cadastro</li></ul></div>
  <div className="diagnostic-tool">
   {!result?<><div className="diagnostic-top"><span>SEU PRÓXIMO PASSO</span><span>Pergunta {step+1} de 12</span><Button variant="ghost" size="icon" onClick={reset} aria-label="Reiniciar diagnóstico" title="Reiniciar diagnóstico"><RotateCcw size={13}/></Button></div><div className="progress-track" role="progressbar" aria-label="Progresso do diagnóstico" aria-valuenow={step+1} aria-valuemin={0} aria-valuemax={12}>{questions.map((q,i)=><span key={q.id} className={`progress-segment ${i<=step?'complete':''}`}/>)}</div><div key={question.id} className="reveal"><p className="question-tag">SOBRE A SUA OPERAÇÃO</p><h3 ref={heading} tabIndex={-1} className="question-title">{question.title}</h3>{question.multiple&&<p className="question-hint">Selecione todos os canais que se aplicam.</p>}<div className="options" role="group" aria-label={question.title}>{question.options.map((option,i)=><Button variant="option" key={option} className={selected.includes(i)?'selected':''} aria-pressed={selected.includes(i)} onClick={()=>choose(i)}><span>{option}</span><span className="option-dot" aria-hidden="true"/></Button>)}</div></div><div className="diagnostic-actions"><Button variant="ghost" disabled={step===0} onClick={()=>{setStep(step-1);focusQuestion();}}><ArrowLeft/>Voltar</Button><Button variant="nexa" className="nexa-button-lg" disabled={!selected.length} onClick={next}>{step===11?'Ver meu resultado':'Continuar'}<ArrowRight/></Button></div><p className="diagnostic-privacy"><ShieldCheck size={11}/>Suas respostas não são enviadas a um servidor.</p></>:<>
    <div className="diagnostic-top"><span>DIAGNÓSTICO CONCLUÍDO</span><Button variant="ghost" onClick={reset} className="text-xs"><RotateCcw/>Refazer diagnóstico</Button></div>
    <div className="result-header reveal"><p className="eyebrow center">Seu NEXAOP Score</p><h2 ref={heading} tabIndex={-1} className="score-value"><span className="gradient-text">{result.score}</span><small> / 100</small></h2><p className="score-classification">{result.classification}</p></div>
    <div className="result-categories">{categories.map(c=><div key={c}><div className="category-label">{c}<strong>{result.categories[c]}</strong></div><meter className="category-meter" min={0} max={100} value={result.categories[c]} aria-label={`${c}: ${result.categories[c]} de 100`}/></div>)}</div>
    <div className="result-details"><div><h3>Principais pontos identificados</h3><ul className="result-findings">{result.findings.map(f=><li key={f}><Check/>{f}</li>)}</ul></div><div className="result-help"><h3>Onde a IA pode ajudar</h3><p>{result.help}</p><h3>Primeiro funcionário IA recomendado</h3><div className="recommended-agent">{result.firstAgent}</div><h3>Maior potencial de ganho</h3><p>{result.potential}</p></div></div>
    <p className="result-disclaimer">Este resultado é uma orientação baseada nas respostas fornecidas e não representa garantia de desempenho futuro.</p>
    <form className="result-form" onSubmit={downloadReport}><h3>Seu diagnóstico completo, com você.</h3><p>Opcional. O relatório será baixado neste dispositivo. Nenhum e-mail será enviado nesta etapa.</p><div className="form-inputs"><label>Nome<input name="name" autoComplete="name"/></label><label>E-mail<input name="email" type="email" autoComplete="email"/></label><label>Empresa<input name="company" autoComplete="organization"/></label></div><div className="result-form-actions"><Button variant="nexa" className="nexa-button-lg" type="submit"><Download/>Receber diagnóstico completo</Button><Button variant="ghost" type="button" onClick={reset}><RotateCcw/>Recomeçar</Button></div>{receipt&&<p role="status" className="mt-3">Seu relatório está pronto para salvar no dispositivo.</p>}</form>
   </>}
  </div>
 </div></section>;
}
