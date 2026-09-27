import type { ApiResponse } from '../types/api';
import type { SimulationState, SimulationScenario } from '../types/incident';
import {
  startSimulation,
  nextEvent,
  previousEvent,
  resetSimulation,
  getSimulationState,
} from '../services/simulation';

export const postSimulationStart = async (scenario: SimulationScenario): Promise<ApiResponse<SimulationState>> => {
  return startSimulation(scenario);
};

export const postSimulationNext = async (): Promise<ApiResponse<SimulationState>> => {
  return nextEvent();
};

export const postSimulationPrevious = async (): Promise<ApiResponse<SimulationState>> => {
  return previousEvent();
};

export const postSimulationReset = async (): Promise<ApiResponse<SimulationState>> => {
  return resetSimulation();
};

export const fetchSimulationState = async (): Promise<ApiResponse<SimulationState>> => {
  return getSimulationState();
};
