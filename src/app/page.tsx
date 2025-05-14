"use client";
import { useState, useEffect } from "react";

type RecipeOption = {
  title: string;
  description: string;
};

export default function Home() {
  const [ingredients, setIngredients] = useState("");
  const [genre, setGenre] = useState("");
  const genreOptions = [
    "Japanese", "Western", "Chinese", "Italian", "French", "Korean", "Ethnic", "Other"
  ];
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "select" | "result">("input");
  const [options, setOptions] = useState<RecipeOption[]>([]);
  const [selected, setSelected] = useState<RecipeOption | null>(null);
  const [detailRecipe, setDetailRecipe] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // For Return to Top button (scroll)
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 200);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleReturnTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // For "Back to Start" button (reset state)
  const handleBackToStart = () => {
    setIngredients("");
    setGenre("");
    setOptions([]);
    setSelected(null);
    setDetailRecipe(null);
    setImageUrl(null);
    setError(null);
    setStep("input");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 1. Input → Get candidates
  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOptions([]);
    setSelected(null);
    setImageUrl(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, genre, mode: "candidates" }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.options)) {
        setOptions(data.options);
        setStep("select");
      } else {
        setError(data.error || "Failed to get recipe suggestions.");
      }
    } catch {
      setError("Network error occurred.");
    }
    setLoading(false);
  };

  // 2. Select candidate → Generate image
  const handleSelect = async (option: RecipeOption) => {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          genre,
          selectedTitle: option.title,
          selectedDescription: option.description,
          mode: "final"
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setImageUrl(data.imageUrl);
        setSelected({
          title: data.selectedTitle ?? option.title,
          description: data.selectedDescription ?? option.description,
        });
        setDetailRecipe(data.detailRecipe ?? "");
        setStep("result");
      } else {
        setError(data.error || "Failed to generate image.");
      }
    } catch {
      setError("Network error occurred.");
    }
    setLoading(false);
  };

  // UI
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-orange-50 via-white to-green-100 flex flex-col items-center">
      {/* Hero Section */}
      <header className="w-full py-4 mb-4 bg-gradient-to-r from-orange-400/70 via-yellow-200/70 to-green-300/70 shadow">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <h1 className="fancy-title text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight text-center">
            CookAI
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 font-medium text-center mt-2">
            AI-powered recipe & food image generator
          </p>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center px-4">
        {/* Step 1: Input */}
        {step === "input" && (
          <form
            onSubmit={handleInputSubmit}
            className="bg-white/90 rounded-2xl shadow-xl p-8 flex flex-col gap-6 w-full max-w-lg border border-orange-100"
          >
            <label className="font-semibold text-gray-800 text-lg">
              Enter ingredients
              <input
                type="text"
                className="mt-3 p-3 border-2 border-orange-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="e.g. Tomato, Egg, Cheese"
                required
              />
            </label>
            <div className="font-semibold text-gray-800 text-lg">
              Choose a cuisine type
              <div className="flex flex-wrap gap-3 mt-3">
                {genreOptions.map((g) => (
                  <button
                    type="button"
                    key={g}
                    className={`px-4 py-2 rounded-full border-2 font-semibold shadow-sm transition-all duration-150 ${
                      genre === g
                        ? "bg-gradient-to-r from-orange-400 to-green-400 text-white border-orange-400 scale-105"
                        : "bg-white text-gray-800 border-gray-300 hover:bg-orange-50"
                    }`}
                    onClick={() => setGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 bg-gradient-to-r from-orange-400 to-green-400 text-white rounded-full px-6 py-3 font-bold text-lg shadow-lg hover:from-orange-500 hover:to-green-500 transition-all duration-150 disabled:opacity-60"
              disabled={loading || !ingredients || !genre}
            >
              {loading ? "Generating..." : "Get Recipe Suggestions"}
            </button>
          </form>
        )}

        {/* Step 2: Select Recipe */}
        {step === "select" && (
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 text-center text-orange-700 drop-shadow">
              Select a recipe suggestion
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  className="bg-white border-2 border-orange-200 rounded-2xl shadow-lg p-6 flex flex-col items-start hover:scale-105 hover:border-orange-400 transition-all duration-150"
                  onClick={() => handleSelect(opt)}
                  disabled={loading}
                >
                  <div className="font-bold text-lg text-orange-700 mb-2">{opt.title}</div>
                  <div className="text-sm text-gray-700">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && selected && (
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 bg-white/95 rounded-2xl shadow-xl p-8 border border-orange-100 mt-4">
            {/* Top: Image + Title/Description */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Left: Image */}
              {imageUrl && (
                <div className="flex-1 flex flex-col justify-center items-center min-w-[260px]">
                  <img
                    src={imageUrl}
                    alt="Dish image"
                    className="rounded-2xl shadow-2xl border-4 border-orange-200 max-h-[420px] w-auto object-contain bg-white"
                    style={{ maxWidth: "100%", minHeight: 220, maxHeight: 420 }}
                  />
                  <span className="text-xs text-gray-500 mt-2">*Image is for illustration purposes</span>
                </div>
              )}
              {/* Right: Title/Description */}
              <div className="flex-1 flex flex-col gap-4 justify-center">
                <h2 className="fancy-title text-3xl font-extrabold text-orange-700">{selected.title}</h2>
                <p className="text-gray-700 text-lg">{selected.description}</p>
              </div>
            </div>
            {/* Bottom: Ingredients/Instructions 2-column */}
            {detailRecipe && (
              <div className="w-full flex flex-col md:flex-row gap-8 mt-8">
                {(() => {
                  // Support both English and Japanese headings for robustness
                  const match =
                    detailRecipe.match(/\[Ingredients\]([\s\S]*?)\[Instructions\]([\s\S]*)/) ||
                    detailRecipe.match(/【材料】([\s\S]*?)【作り方】([\s\S]*)/);
                  if (match) {
                    const ingredients = match[1].trim();
                    const steps = match[2].trim();
                    return (
                      <>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-orange-600 mb-2 border-b border-orange-200 pb-1">Ingredients</h3>
                          <pre className="whitespace-pre-wrap text-base text-gray-800 font-mono bg-orange-50 rounded-lg p-4 border border-orange-100">{ingredients}</pre>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-orange-600 mb-2 border-b border-orange-200 pb-1">Instructions</h3>
                          <pre className="whitespace-pre-wrap text-base text-gray-800 font-mono bg-orange-50 rounded-lg p-4 border border-orange-100">{steps}</pre>
                        </div>
                      </>
                    );
                  }
                  // fallback: show all as is
                  return (
                    <pre className="whitespace-pre-wrap text-base text-gray-800 font-mono bg-orange-50 rounded-lg p-4 border border-orange-100">{detailRecipe}</pre>
                  );
                })()}
              </div>
            )}
            {/* Back to Start Button */}
            <div className="w-full flex justify-center mt-8">
              <button
                onClick={handleBackToStart}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg font-bold text-base transition-all duration-150"
              >
                ← Back to Start
              </button>
            </div>
          </div>
        )}

        {/* Error & Loading */}
        {error && (
          <div className="mt-8 text-red-600 font-bold text-lg bg-white/80 rounded-xl px-6 py-4 shadow">
            {error}
          </div>
        )}
        {loading && (
          <div className="mt-8 text-center text-orange-700 font-bold text-lg animate-pulse">
            Generating...
          </div>
        )}
      </main>

      {/* Return to Top Button */}
      {showTop && (
        <button
          onClick={handleReturnTop}
          className="fixed bottom-8 right-8 z-50 bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-full shadow-lg font-bold text-base transition-all duration-150"
          aria-label="Return to Top"
        >
          ↑ Return to Top
        </button>
      )}

      {/* Footer */}
      <footer className="w-full py-6 mt-12 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} CookAI
      </footer>
    </div>
  );
}
