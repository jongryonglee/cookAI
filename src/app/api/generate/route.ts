// /api/generate endpoint
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ingredients, genre, mode, selectedTitle, selectedDescription } = body;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key is not set." }, { status: 500 });
  }

  // Generate recipe candidates
  if (mode === "candidates") {
    const prompt = `
You are a professional chef. Based on the following ingredients and cuisine type, come up with 3 different recipe ideas in English.
For each recipe, output two lines: "Title:" and "Description:".

Ingredients: ${ingredients}
Cuisine: ${genre}

Example:
Title: Tomato and Egg Italian Stir-fry
Description: Tomatoes and eggs sautéed in olive oil, finished with basil and cheese for an Italian-style dish.

Title: ...
Description: ...

Title: ...
Description: ...
`;

    const recipeRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a professional chef." },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!recipeRes.ok) {
      return NextResponse.json({ error: "Failed to generate recipe suggestions." }, { status: 500 });
    }

    const recipeData = await recipeRes.json();
    const text = recipeData.choices?.[0]?.message?.content ?? "";
    // Parse 3 candidates
    const options = Array.from(text.matchAll(/Title:\s*(.+)\nDescription:\s*([^\n]+)/g)).map(match => {
      const m = match as unknown as string[];
      return {
        title: m[1]?.trim() ?? "",
        description: m[2]?.trim() ?? "",
      };
    }).slice(0, 3);

    if (options.length === 0) {
      return NextResponse.json({ error: "Failed to parse recipe suggestions." }, { status: 500 });
    }

    return NextResponse.json({ options });
  }

  // Final recipe selection → Generate image and recipe in parallel
  if (mode === "final" && selectedTitle && selectedDescription) {
    // Prompts
    const detailPrompt = `
Recipe Name: ${selectedTitle}
Cuisine: ${genre}
Ingredients: ${ingredients}

Write a detailed recipe for this dish in English.
Include the headings [Ingredients] and [Instructions], and provide a detailed list of ingredients and step-by-step instructions.
`;

    // Start both requests in parallel
    const recipePromise = fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a professional chef." },
          { role: "user", content: detailPrompt }
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    const imagePromise = fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Recipe Name: ${selectedTitle}
Description: ${selectedDescription}
A realistic, high-resolution professional food photo of a ${genre} dish. Natural lighting, realistic plating, simple background, appetizing and beautiful.`,
        n: 1,
        size: "1024x1024",
      }),
    });

    // Wait for both in parallel
    const [detailRes, imageRes] = await Promise.all([recipePromise, imagePromise]);

    if (!detailRes.ok) {
      return NextResponse.json({ error: "Failed to generate detailed recipe." }, { status: 500 });
    }
    if (!imageRes.ok) {
      const imageText = await imageRes.text();
      return NextResponse.json({ error: "Failed to generate image: " + imageText }, { status: 500 });
    }

    const detailData = await detailRes.json();
    const detailRecipe = detailData.choices?.[0]?.message?.content ?? "";

    const imageData = await imageRes.json();
    const imageUrl = imageData.data?.[0]?.url ?? null;

    return NextResponse.json({
      imageUrl,
      selectedTitle,
      detailRecipe
    });
  }

  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}
