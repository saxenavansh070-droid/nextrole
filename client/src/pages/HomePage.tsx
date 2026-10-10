import { useCallback, useEffect, useState } from 'react';
import ExperienceCard from '../components/ExperienceCard';
import Hero from '../components/Hero';
import RolesPanel from '../components/RolesPanel';
import { useAuth } from '../context/AuthContext';
import { analyzeFile, analyzeText, fetchProfile, setLastResult } from '../lib/api';
import { content } from '../lib/content';
import type { AnalyzeResult, AnalyzeStatus } from '../types';

export default function HomePage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<AnalyzeStatus>('idle');
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // When signed in, restore the most recent saved analysis.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchProfile()
      .then(({ analyses }) => {
        const latest = analyses[0];
        if (!cancelled && latest) {
          setResult({
            skills: latest.skills,
            summary: latest.summary,
            roles: latest.roles,
            source: latest.source,
          });
          setLastResult({
            skills: latest.skills,
            summary: latest.summary,
            roles: latest.roles,
            source: latest.source,
            fileName: latest.fileName,
          });
          setFileName(latest.fileName ?? null);
          setStatus('ready');
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  const applyResponse = useCallback((response: Awaited<ReturnType<typeof analyzeFile>>) => {
    if (!response.ok) {
      throw new Error(response.error ?? content.experience.errors.server);
    }
    setResult({
      skills: response.skills,
      summary: response.summary,
      roles: response.roles,
      source: response.source,
    });
    setLastResult({
      skills: response.skills,
      summary: response.summary,
      roles: response.roles,
      source: response.source,
      fileName: response.fileName,
    });
    setStatus('ready');
    setError(null);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setStatus('loading');
      setError(null);
      setFileName(file.name);
      try {
        const response = await analyzeFile(file);
        applyResponse(response);
      } catch (cause) {
        setResult(null);
        setStatus('error');
        setError(cause instanceof Error ? cause.message : content.experience.errors.server);
      }
    },
    [applyResponse],
  );

  const handleText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) {
        setError(content.experience.errors.empty);
        setStatus('error');
        return;
      }
      if (text.length < 60) {
        setError(content.experience.errors.tooShort);
        setStatus('error');
        return;
      }
      setStatus('loading');
      setError(null);
      setFileName(null);
      try {
        const response = await analyzeText(text);
        applyResponse(response);
      } catch (cause) {
        setResult(null);
        setStatus('error');
        setError(cause instanceof Error ? cause.message : content.experience.errors.server);
      }
    },
    [applyResponse],
  );

  return (
    <>
      <Hero />

      <div className="mx-auto grid max-w-[1240px] items-start gap-7 px-5 pb-20 sm:px-6 lg:grid-cols-[minmax(0,395px)_minmax(0,1fr)] lg:gap-10">
        <ExperienceCard
          status={status}
          error={error}
          fileName={fileName}
          onFile={handleFile}
          onText={handleText}
        />
        <RolesPanel status={status} result={result} />
      </div>
    </>
  );
}
