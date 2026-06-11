import { redirect } from 'next/navigation'

// Step-8은 Step-7(출력·다운로드)로 통합됨
export default function Step8Redirect({ params }: { params: { sessionId: string } }) {
  redirect(`/coverage-pro/${params.sessionId}/step-7`)
}
