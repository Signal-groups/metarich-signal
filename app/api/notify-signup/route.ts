import { NextRequest, NextResponse } from "next/server";

type SignupNotifyRequest = {
  source?: "web" | "app";
  email?: string;
  name?: string;
  phone?: string;
  accountType?: string;
  headquarter?: string;
  department?: string;
  branch?: string;
  companyName?: string;
  position?: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function labelAccountType(value: string) {
  if (value === "external") return "타사";
  if (value === "signal") return "시그널그룹";
  return value || "확인 필요";
}

function buildMessage(body: SignupNotifyRequest) {
  const source = body.source === "app" ? "모바일 앱" : "PC 프로그램";
  const accountType = clean(body.accountType);
  const org = accountType === "external"
    ? [clean(body.companyName), clean(body.position)].filter(Boolean).join(" / ")
    : [clean(body.headquarter), clean(body.department), clean(body.branch)].filter(Boolean).join(" / ");

  return [
    "🔔 신규 회원가입 신청",
    "",
    `접수 경로: ${source}`,
    `구분: ${labelAccountType(accountType)}`,
    `이름: ${clean(body.name) || "확인 필요"}`,
    `이메일: ${clean(body.email) || "확인 필요"}`,
    `휴대폰: ${clean(body.phone) || "확인 필요"}`,
    `소속: ${org || "나중에 배정"}`,
    "",
    "관리자 페이지에서 승인 여부를 확인해주세요.",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SIGNUP_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json(
      { ok: false, skipped: true, error: "텔레그램 환경변수가 설정되지 않았습니다." },
      { status: 200 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as SignupNotifyRequest;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildMessage(body),
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: data?.description || "텔레그램 알림 발송에 실패했습니다." },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true });
}
