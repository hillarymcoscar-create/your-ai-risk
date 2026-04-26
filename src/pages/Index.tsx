import { useEffect, useState } from "react";
import { Landing } from "@/components/humanise/Landing";
import { Quiz } from "@/components/humanise/Quiz";
import { Calculating } from "@/components/humanise/Calculating";
import { Results } from "@/components/humanise/Results";
import type { QuizAnswers } from "@/lib/humanise";
import { loadAll } from "@/lib/onet";

type Stage = "landing" | "quiz" | "calculating" | "results";

const Index = () => {
  const [stage, setStage] = useState<Stage>("landing");
  const [answers, setAnswers] = useState<QuizAnswers | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  if (stage === "landing") return <Landing onStart={() => setStage("quiz")} />;
  if (stage === "quiz")
    return (
      <Quiz
        onExit={() => setStage("landing")}
        onComplete={(a) => {
          setAnswers(a);
          setStage("calculating");
        }}
      />
    );
  if (stage === "calculating") return <Calculating onDone={() => setStage("results")} />;
  if (stage === "results" && answers)
    return <Results answers={answers} onRestart={() => { setAnswers(null); setStage("landing"); }} />;

  return null;
};

export default Index;
