"use client";

import { useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { DOCTOR_TOUR } from "@/lib/tours/doctorTour";
import DemoTourOverlay from "@/components/DemoTourOverlay";

const TOUR_PARAM = "tour";
const STEP_PARAM = "step";
const TOUR_ID = "doctor";

/** Delay (ms) before trying to find and highlight a DOM element after navigation. */
const HIGHLIGHT_DELAY_MS = 150;

/**
 * TourController – client component placed in the root layout.
 *
 * Reads `?tour=doctor&step=N` from the URL to drive the demo tour:
 * - Renders DemoTourOverlay for the active step.
 * - Navigates to the step's `route` when the step changes.
 * - Highlights the element matching `data-tour-id` and scrolls it into view.
 * - Removing the URL params (onClose) ends the tour without side effects.
 *
 * Must be wrapped in <Suspense> by its parent because it uses useSearchParams.
 */
export default function TourController() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const tourParam = searchParams.get(TOUR_PARAM);
  const stepParam = searchParams.get(STEP_PARAM);

  const isActive = tourParam === TOUR_ID;
  const parsedStep = parseInt(stepParam ?? "", 10);
  const currentStep = isActive && !Number.isNaN(parsedStep)
    ? Math.max(0, Math.min(parsedStep, DOCTOR_TOUR.length - 1))
    : 0;

  const step = isActive ? DOCTOR_TOUR[currentStep] : undefined;

  // Navigate to the step's route if we are not already on it.
  // `step` is always DOCTOR_TOUR[currentStep] (static constant), so excluding
  // it from deps is intentional – currentStep is the sole driver of step changes.
  useEffect(() => {
    if (!isActive || !step?.route) return;
    if (pathname !== step.route) {
      router.push(`${step.route}?${TOUR_PARAM}=${TOUR_ID}&${STEP_PARAM}=${currentStep}`);
    }
  // pathname and router are stable refs; step is derived from the static DOCTOR_TOUR[currentStep].
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep]);

  // Highlight the target element and scroll it into view.
  // `step.targetDataTourId` is derived from the static DOCTOR_TOUR[currentStep],
  // so currentStep is the sole driver; excluding step from deps is intentional.
  useEffect(() => {
    if (!isActive) {
      removeHighlight();
      return;
    }

    removeHighlight();

    if (!step?.targetDataTourId) return;

    const tourId = step.targetDataTourId;
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-tour-id="${tourId}"]`);
      if (!el) return;
      el.setAttribute("data-tour-highlighted", "true");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, HIGHLIGHT_DELAY_MS);

    return () => {
      clearTimeout(timer);
      removeHighlight();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep]);

  if (!isActive || !step) return null;

  function handleNavigate(delta: number) {
    const next = currentStep + delta;
    if (next < 0 || next >= DOCTOR_TOUR.length) return;
    const nextStep = DOCTOR_TOUR[next];
    const targetRoute = nextStep?.route ?? pathname;
    router.push(`${targetRoute}?${TOUR_PARAM}=${TOUR_ID}&${STEP_PARAM}=${next}`);
  }

  function handleClose() {
    removeHighlight();
    router.push(pathname);
  }

  return (
    <DemoTourOverlay
      currentStep={currentStep}
      onNavigate={handleNavigate}
      onClose={handleClose}
    />
  );
}

function removeHighlight() {
  document.querySelectorAll("[data-tour-highlighted]").forEach((el) => {
    el.removeAttribute("data-tour-highlighted");
  });
}
