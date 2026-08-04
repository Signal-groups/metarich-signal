import { redirect } from "next/navigation"

// 브랜딩 빌더는 별도 프로젝트(branding-studio)로 분리됐다.
// 이 라우트는 더 이상 무거운 에디터를 번들에 포함하지 않고 외부로 리다이렉트만 한다.
export default function BrandingBuilderRedirectPage() {
  redirect(process.env.NEXT_PUBLIC_BRANDING_URL || "https://branding.metarich-signal.com")
}
