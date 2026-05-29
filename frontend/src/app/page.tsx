"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imgError, setImgError] = useState(false);

  const steps = [
    {
      num: "01",
      title: "PDF → Imagini HD",
      desc: "Culegerea PDF este convertită în imagini PNG la rezoluție ridicată pentru a păstra claritatea formulelor matematice.",
      color: "blue",
      placeholder: "/step1_pdf_to_png.png",
    },
    {
      num: "02",
      title: "Segmentare cu OpenCV",
      desc: "Detecția contururilor extrage automat fiecare grilă individuală din pagină.",
      color: "violet",
      placeholder: "/step2_segmentation.png",
    },
    {
      num: "03",
      title: "Indexare OCR",
      desc: "Tesseract OCR identifică și citește numărul fiecărei grile, redenumind automat fișierele cu prefixul corespunzător.",
      color: "amber",
      placeholder: "/step3_ocr_index.png",
    },
    {
      num: "04",
      title: "Extragere Răspunsuri",
      desc: "Paginile cu baremul sunt procesate, iar răspunsurile sunt mapate într-un fișier JSON.",
      color: "emerald",
      placeholder: "/step4_answers.png",
    },
    {
      num: "05",
      title: "Generator de Simulări",
      desc: "Utilizatorul configurează capitolele și ponderile, iar algoritmul asamblează un test unic, cu distribuție proporțională și verificare automată.",
      color: "rose",
      placeholder: "/step5_generator.png",
    },
  ];

  const colorMap: Record<string, { numBg: string; numText: string; accent: string; accentDark: string }> = {
    blue: { numBg: "bg-blue-500", numText: "text-white", accent: "border-blue-200", accentDark: "dark:border-blue-800" },
    violet: { numBg: "bg-violet-500", numText: "text-white", accent: "border-violet-200", accentDark: "dark:border-violet-800" },
    amber: { numBg: "bg-amber-500", numText: "text-white", accent: "border-amber-200", accentDark: "dark:border-amber-800" },
    emerald: { numBg: "bg-emerald-500", numText: "text-white", accent: "border-emerald-200", accentDark: "dark:border-emerald-800" },
    rose: { numBg: "bg-rose-500", numText: "text-white", accent: "border-rose-200", accentDark: "dark:border-rose-800" },
  };

  useEffect(() => {
    setImgError(false);
  }, [currentSlide]);

  return (
    <div className="flex flex-col items-center">
      <section className="w-full bg-white dark:bg-slate-900 flex justify-center py-20 px-6 sm:px-12 transition-colors duration-300">
        <div className="max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
            Transformă culegerile de grile <br /> în{" "}
            <span className="text-blue-600 dark:text-blue-400">simulări interactive</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Platformă de digitalizare și automatizare a procesului de pregătire
            pentru admiterea la Facultatea de Automatică și Calculatoare (UTCN).
          </p>
        </div>
      </section>

      <section className="w-full bg-slate-50 dark:bg-slate-950 py-20 flex justify-center px-6 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
              De la PDF scanat la test interactiv
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Cinci etape automatizate transformă o culegere fizică într-o bancă de grile digitale, gata pentru generarea simulărilor.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-10 shadow-xl border border-slate-200 dark:border-slate-800 transition-colors duration-300 relative overflow-hidden">
              <div className="flex flex-col gap-8">
                <div className="w-full aspect-video bg-slate-100 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 relative overflow-hidden group shadow-sm">
                  <img
                    key={currentSlide}
                    src={steps[currentSlide].placeholder}
                    alt={steps[currentSlide].title}
                    className={`w-full h-full object-cover absolute inset-0 z-10 transition-opacity duration-300 ${imgError ? "opacity-0" : "opacity-100"}`}
                    onLoad={() => setImgError(false)}
                    onError={() => setImgError(true)}
                  />

                  {imgError && (
                    <>
                      <ImageIcon className="w-16 h-16 mb-4 opacity-40 z-0" />
                      <span className="text-base font-bold tracking-wide z-0 bg-slate-100/80 dark:bg-slate-900/80 px-4 py-1.5 rounded-full backdrop-blur-sm">
                        Screenshot: {steps[currentSlide].title}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-start gap-5 flex-1">
                    <div className={`shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl text-2xl font-black shadow-lg ${colorMap[steps[currentSlide].color].numBg} ${colorMap[steps[currentSlide].color].numText}`}>
                      {steps[currentSlide].num}
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                        {steps[currentSlide].title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                        {steps[currentSlide].desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-4 shrink-0">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCurrentSlide((prev) => (prev === 0 ? steps.length - 1 : prev - 1))}
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setCurrentSlide((prev) => (prev === steps.length - 1 ? 0 : prev + 1))}
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="flex gap-2 pr-2">
                      {steps.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentSlide(i)}
                          className={`h-2.5 rounded-full transition-all duration-300 ${currentSlide === i
                            ? `w-8 ${colorMap[steps[currentSlide].color].numBg}`
                            : "w-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                            }`}
                          aria-label={`Slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
