import { NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

export async function POST(request: Request) {
  try {
    const { stageName, roles, genres, portfolioText } = (await request.json()) as {
      stageName?: string;
      roles?: string[];
      genres?: string[];
      portfolioText?: string;
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 설정되어 있지 않습니다." },
        { status: 500 }
      );
    }

    const systemPrompt =
      "너는 뮤지션 프로필 작성을 돕는 어시스턴트다. " +
      "친근하고 자연스러운 한국어로 한 줄 소개(1문장)만 작성한다. " +
      "과장하거나 허위 사실을 만들지 않는다. " +
      "아티스트의 포지션/장르/작업 성향을 간결하게 반영한다. " +
      "길이는 30~60자 정도로 유지한다.";

    const userPrompt = [
      `활동명: ${stageName ?? "없음"}`,
      `포지션: ${(roles ?? []).join(", ") || "없음"}`,
      `장르: ${(genres ?? []).join(", ") || "없음"}`,
      portfolioText ? `포트폴리오: ${portfolioText}` : "포트폴리오: 없음"
    ].join("\n");

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "OpenAI API 오류", detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text =
      data?.output?.[0]?.content?.[0]?.text ??
      "현재 응답을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.";

    return NextResponse.json({ reply: text });
  } catch (error) {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다.", detail: String(error) },
      { status: 500 }
    );
  }
}
