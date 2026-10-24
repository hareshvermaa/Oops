import React, { useState } from 'react';
import { ArrowLeft, Play, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { runAutomatedValidationSuite, LevelValidationResult, FullValidationReport, validateSingleLevel } from '../game/validator';
import { sound } from '../utils/audio';

interface ValidatorScreenProps {
  onBack: () => void;
  onPlayLevel: (levelId: number) => void;
}

export const ValidatorScreen: React.FC<ValidatorScreenProps> = ({
  onBack,
  onPlayLevel,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentLevelId, setCurrentLevelId] = useState<number | null>(null);
  const [report, setReport] = useState<FullValidationReport | null>(null);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');

  const startFullValidation = async () => {
    sound.playClick();
    setIsRunning(true);
    setProgress(0);
    setReport(null);

    try {
      const fullReport = await runAutomatedValidationSuite((prog, cur) => {
        setProgress(prog);
        setCurrentLevelId(cur.levelId);
      });
      setReport(fullReport);
      sound.playFanfare();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
      setCurrentLevelId(null);
    }
  };

  const testFirstTenOnly = async () => {
    sound.playClick();
    setIsRunning(true);
    setProgress(0);
    setReport(null);

    const results: LevelValidationResult[] = [];
    let passed = 0;
    let frames = 0;

    for (let id = 1; id <= 10; id++) {
      const res = validateSingleLevel(id);
      results.push(res);
      if (res.solvable) {
        passed++;
        frames += res.framesTaken;
      }
      setProgress(id / 10);
      setCurrentLevelId(id);
      await new Promise((r) => setTimeout(r, 20));
    }

    setReport({
      totalLevels: 10,
      passedCount: passed,
      failedCount: 10 - passed,
      passRatePercent: Number(((passed / 10) * 100).toFixed(1)),
      averageFrames: passed > 0 ? Math.round(frames / passed) : 0,
      results,
      timestamp: new Date().toISOString(),
    });

    setIsRunning(false);
    setCurrentLevelId(null);
    sound.playDing();
  };

  const displayedResults = report
    ? report.results.filter((r) => {
        if (filter === 'passed') return r.solvable;
        if (filter === 'failed') return !r.solvable;
        return true;
      })
    : [];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-white select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </button>

        <h2 className="text-sm font-bold text-amber-400">
          Automated QA Validator
        </h2>

        <div className="w-16" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Banner Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            This tool executes headless Matter.js physics simulations across level configurations using their calibrated intended solutions, verifying physical reachability of each goal sensor.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              disabled={isRunning}
              onClick={startFullValidation}
              className={`flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                isRunning
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? `Testing Level ${currentLevelId}...` : 'Run All 200 Levels Test'}</span>
            </button>

            <button
              disabled={isRunning}
              onClick={testFirstTenOnly}
              className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isRunning
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
              }`}
            >
              <span>Verify First 10 Levels</span>
            </button>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Testing physics engines...</span>
                <span className="font-mono text-emerald-400">{Math.round(progress * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Validation Summary Report */}
        {report && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Verification Results ({report.totalLevels} levels)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {report.timestamp.slice(11, 19)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 flex flex-col items-center">
                <span className="text-[11px] text-slate-400">Pass Rate</span>
                <span className="text-lg font-black text-emerald-400 tabular-nums">
                  {report.passRatePercent}%
                </span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 flex flex-col items-center">
                <span className="text-[11px] text-slate-400">Passed</span>
                <span className="text-lg font-black text-white tabular-nums">
                  {report.passedCount} / {report.totalLevels}
                </span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 flex flex-col items-center">
                <span className="text-[11px] text-slate-400">Avg Frames</span>
                <span className="text-lg font-black text-amber-400 tabular-nums">
                  {report.averageFrames}
                </span>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${
                  filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({report.results.length})
              </button>
              <button
                onClick={() => setFilter('passed')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${
                  filter === 'passed' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Passed ({report.passedCount})
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${
                  filter === 'failed' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Failed ({report.failedCount})
              </button>
            </div>

            {/* Results List */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {displayedResults.map((r) => (
                <div
                  key={r.levelId}
                  className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {r.solvable ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-mono text-slate-400 shrink-0">#{r.levelId}</span>
                    <span className="truncate font-medium text-slate-200">{r.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {r.framesTaken}f ({((r.framesTaken / 60)).toFixed(1)}s)
                    </span>
                    <button
                      onClick={() => {
                        sound.playClick();
                        onPlayLevel(r.levelId);
                      }}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] active:scale-95 transition-all"
                    >
                      Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
