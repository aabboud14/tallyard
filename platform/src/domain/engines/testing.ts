// Testing requests (owner-surveyor design 14.4.4): which tests suit the chosen items, which companies can do them in
// the building's region, and what a result may record. Pure.
import type { FamilyId } from '../types'
import { TEST_SERVICE_ORDER, TEST_SERVICES, TESTING_COMPANIES, type TestingCompany, type TestService } from '../reference/testing'

/** Tests (in table order) that apply to at least one of the families. */
export function servicesForFamilies(families: FamilyId[]): TestService[] {
  return TEST_SERVICE_ORDER.filter((s) => TEST_SERVICES[s].families.some((f) => families.includes(f)))
}

/** Companies offering every chosen test and covering the region, by name. None when no test is chosen. */
export function companiesFor(services: TestService[], region: string): TestingCompany[] {
  if (services.length === 0) return []
  return TESTING_COMPANIES.filter((c) => services.every((s) => c.services.includes(s)) && c.regions.includes(region)).sort((a, b) => a.name.localeCompare(b.name, 'en-GB'))
}

/** A visual survey alone can only inspect; any other test can record a tested result. */
export function resultStatusesFor(services: TestService[]): ('inspected' | 'tested')[] {
  return services.length === 1 && services[0] === 'visual_dimensional' ? ['inspected'] : ['inspected', 'tested']
}

/** Whether the chosen tests confirm a steel grade. */
export function recordsGrade(services: TestService[]): boolean {
  return services.some((s) => TEST_SERVICES[s].grades)
}
