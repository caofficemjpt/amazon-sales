import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Period } from '../types';

/** localStorage key for persisting selected period */
const STORAGE_KEY = 'amazon_dashboard_period_id';

interface PeriodState {
  selectedPeriod: Period | null;
  periods: Period[];
}

type PeriodAction =
  | { type: 'SET_PERIOD'; payload: Period | null }
  | { type: 'SET_PERIODS'; payload: Period[] }
  | { type: 'ADD_PERIOD'; payload: Period }
  | { type: 'REMOVE_PERIOD'; payload: string };

function periodReducer(state: PeriodState, action: PeriodAction): PeriodState {
  switch (action.type) {
    case 'SET_PERIOD':
      return { ...state, selectedPeriod: action.payload };
    case 'SET_PERIODS':
      return { ...state, periods: action.payload };
    case 'ADD_PERIOD':
      return {
        ...state,
        periods: [action.payload, ...state.periods.filter((p) => p.id !== action.payload.id)],
      };
    case 'REMOVE_PERIOD':
      return {
        ...state,
        periods: state.periods.filter((p) => p.id !== action.payload),
        selectedPeriod:
          state.selectedPeriod?.id === action.payload ? null : state.selectedPeriod,
      };
    default:
      return state;
  }
}

interface PeriodContextValue {
  state: PeriodState;
  dispatch: React.Dispatch<PeriodAction>;
  setSelectedPeriod: (period: Period | null) => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

interface PeriodProviderProps {
  children: ReactNode;
}

export function PeriodProvider({ children }: PeriodProviderProps) {
  const [state, dispatch] = useReducer(periodReducer, {
    selectedPeriod: null,
    periods: [],
  });

  // Persist selected period ID to localStorage
  useEffect(() => {
    if (state.selectedPeriod) {
      localStorage.setItem(STORAGE_KEY, state.selectedPeriod.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state.selectedPeriod]);

  // Restore selected period from localStorage after periods load
  useEffect(() => {
    if (state.periods.length === 0) return;
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId && !state.selectedPeriod) {
      const found = state.periods.find((p) => p.id === savedId);
      if (found) {
        dispatch({ type: 'SET_PERIOD', payload: found });
      }
    }
  }, [state.periods, state.selectedPeriod]);

  function setSelectedPeriod(period: Period | null) {
    dispatch({ type: 'SET_PERIOD', payload: period });
  }

  return (
    <PeriodContext.Provider value={{ state, dispatch, setSelectedPeriod }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriodContext(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error('usePeriodContext must be used inside PeriodProvider');
  }
  return ctx;
}
