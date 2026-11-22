// Cloudflare Pages Functions: POST /api/analyze
// Set GEMINI_API_KEY as a Cloudflare Pages secret. Never put it in index.html or GitHub.
const INSTRUCTION = `Bạn là bộ nhận dạng bản hướng dẫn guitar TIẾNG VIỆT từ ẢNH, không phải máy tự sáng tác nhạc.

MỤC TIÊU: Trích từng DÒNG LỜI trong ảnh; ký hiệu hợp âm (Am, G, F, Dm,...) ở phía trên; và ký hiệu cách chơi (B, Bass, (321), 3, (21), X, XL, n...) nằm gần dòng lời, giữ vị trí NGANG của từng thành phần. Ảnh gốc có thể để ký hiệu gảy ở phía TRÊN lời; bản xuất sẽ đảo thành cách chơi BÊN DƯỚI lời.

QUY TẮC CHÍNH XÁC:
1. Nhìn ảnh, đọc theo từng hàng trái->phải, trên->dưới. Phân biệt hợp âm viết phía trên mũi tên với ký hiệu gảy dưới mũi tên. Bỏ qua MŨI TÊN, đường kẻ, chữ số đánh nhịp không liên quan.
2. Mỗi hàng trả về danh sách words (từng chữ TIẾNG VIỆT được nhìn thấy, không nối hai chữ cách nhau), chords và notes. Từng mục có x là tọa độ ngang X của vị trí bên trái ký tự, chuẩn hóa theo CHIỀU RỘNG TOÀN ẢNH: x = round(left_px / image_width * 1000), trong khoảng 0..1000. Giữ cùng thang tọa độ cho cả ba danh sách để căn các nốt vào lời.
3. Hợp âm chord.name không có ngoặc vuông. beforeWord là CHỈ SỐ từ 0 của chữ đầu tiên mà hợp âm sẽ đứng TRƯỚC trong bản nhạc Word. Chọn chữ gần vị trí hợp âm, ưu tiên chữ nằm ngay bên dưới hoặc ngay bên phải mũi tên hợp âm. Ví dụ chord Am trên chữ 'Lần' thì beforeWord = 0.
4. Dấu ngoặc của chuỗi (321), (21) PHẢI GIỮ NGUYÊN. Không đổi B thành Bass hay (321) thành 321 nếu không thấy như vậy. Không sáng tác thêm nốt, chữ hoặc hợp âm không hiện trong ảnh.
5. Nếu chữ mờ không rõ, chép phần chắc chắn, không đoán. Không đưa chú thích, giải thích, tiêu đề ngoài ảnh vào lời. Các hàng lời khác nhau phải là các đối tượng rows riêng.
6. Trả về JSON hợp lệ duy nhất: {"rows":[{"words":[{"text":"Lần","x":36},{"text":"đầu","x":100}],"chords":[{"name":"Am","x":56,"beforeWord":0}],"notes":[{"text":"B","x":113},{"text":"(321)","x":200}]}]}. Không dùng markdown hay code fence.
7. Các nốt có thể nằm tại khoảng trắng; trả x của chúng đúng như ảnh, KHÔNG ép vào vị trí của từ gần nhất.
8. Nếu cùng một ảnh có nhiều dòng, trả ĐẦY ĐỦ từng dòng và KHÔNG gộp dòng. Chữ cuối dòng có thể không có cách chơi. Ký hiệu ở ảnh đôi khi màu đỏ, lời đen; dựa cả màu lẫn cấu trúc.

Đây là điệu và cách chơi do người dùng cung cấp để tham khảo, KHÔNG được dùng chúng để tự điền nốt không hiện trong ảnh.`;

const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{
 status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});
const compact=(v,max)=>String(v??'').trim().slice(0,max);
function safeRows(json){
 if(!Array.isArray(json?.rows))return [];
 return json.rows.slice(0,65).map(r=>({
  words:(Array.isArray(r.words)?r.words:[]).slice(0,100).map(w=>({text:compact(w.text,90),x:Math.max(0,Math.min(1000,+w.x||0))})).filter(w=>w.text),
  chords:(Array.isArray(r.chords)?r.chords:[]).slice(0,30).map(c=>({name:compact(c.name,20).replace(/[\[\]]/g,''),x:Math.max(0,Math.min(1000,+c.x||0)),beforeWord:Math.max(0,Math.round(+c.beforeWord||0))})).filter(c=>c.name),
  notes:(Array.isArray(r.notes)?r.notes:[]).slice(0,100).map(n=>({text:compact(n.text,45),x:Math.max(0,Math.min(1000,+n.x||0))})).filter(n=>n.text)
 })).filter(r=>r.words.length);
}
export async function onRequestPost({request,env}){
 try{
  const origin=request.headers.get('Origin');
  if(origin&&new URL(origin).host!==new URL(request.url).host) return reply({error:'Yêu cầu khác nguồn bị chặn.'},403);
  if(!env.GEMINI_API_KEY) return reply({error:'Chưa cấu hình GEMINI_API_KEY trên Cloudflare Pages. Mở README.md để làm theo hướng dẫn.'},503);
  if(+(request.headers.get('Content-Length')||0)>11_500_000)return reply({error:'Ảnh quá lớn. Vui lòng gửi ảnh dưới 8 MB.'},413);
  const data=await request.json();
  if(typeof data.image!=='string'||data.image.length>11_500_000)return reply({error:'Dữ liệu ảnh không hợp lệ hoặc quá lớn.'},400);
  const match=data.image.match(/^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/=]+)$/);
  if(!match)return reply({error:'Ảnh phải ở dạng PNG, JPG hoặc WEBP.'},400);
  const rhythm=compact(data.rhythm,40),patterns=Array.isArray(data.patterns)?data.patterns.slice(0,6).map(x=>compact(x,100)):[];
  const aiRequest={contents:[{role:'user',parts:[
   {text:INSTRUCTION+'\nĐiệu đang chọn: '+rhythm+'; cách chơi tham khảo: '+patterns.join(' | ')+'\nHãy đọc ảnh và trả về JSON.'},
   {inline_data:{mime_type:match[1],data:match[2]}}
  ]}],generationConfig:{temperature:0.1,responseMimeType:'application/json',maxOutputTokens:8192}};
  const model=env.GEMINI_MODEL||'gemini-2.5-flash';
  if(/^gemini-3[.\-]/.test(model))aiRequest.generationConfig.thinkingConfig={thinkingLevel:'low'};
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify(aiRequest),signal:AbortSignal.timeout(60000)
  });
  const ai=await response.json();
  if(!response.ok){const code=response.status;
   return reply({error:code===429?'Hết lượt hoặc giới hạn yêu cầu Gemini. Vui lòng thử lại sau.':code===404?'Model Gemini này không khả dụng với API key. Hãy kiểm tra GEMINI_MODEL trên Cloudflare.':code===400||code===401||code===403?'Gemini từ chối yêu cầu. Kiểm tra API key và quyền truy cập model.':'Gemini trả lỗi HTTP '+code+'.'},502);
  }
  const raw=ai.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
  if(!raw)return reply({error:'Gemini không trả văn bản. Hãy thử ảnh rõ hơn.'},502);
  const parsed=JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/```\s*$/,''));
  const rows=safeRows(parsed);
  if(!rows.length)return reply({error:'Không đọc được lời bài hát trong ảnh. Vui lòng thử ảnh chụp rõ hơn.'},422);
  return reply({rows});
 }catch(e){
  return reply({error:e.name==='TimeoutError'?'AI phản hồi quá lâu. Hãy thử ảnh nhỏ hơn.':'Lỗi xử lý ảnh. '+compact(e.message,160)},500);
 }
}
export async function onRequestGet(){return reply({error:'Chỉ hỗ trợ POST /api/analyze.'},405);}
