export type Program = 'family' | 'standard';
export type Property = 'new' | 'resale';
export type Step = 1 | 2 | 3 | 4;
export type Scenario = { emptyProfile: boolean; marketingGiven: boolean; failOnce: boolean };
export type Draft = {
  purchaseWhen: string;
  propertyFound: string;
  consultant: string;
  income: string;
  hasLoans: string;
  loanPayment: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  marketing: boolean;
};
export type Errors = Partial<Record<keyof Draft, string>>;
export const defaultScenario: Scenario = {
  emptyProfile: false,
  marketingGiven: false,
  failOnce: false,
};
export const steps = ['Ваши планы', 'Бюджет', 'Контакты', 'Звонок'];
export const timeSlots = ['10:00', '12:00', '14:00', '16:00', '18:00'];
export const money = (value: number) => new Intl.NumberFormat('ru-RU').format(value);
export const parseMoney = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.'));
export const formatMoneyInput = (value: string) => {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 9);
  return digits ? money(Number(digits)) : '';
};
export function createDraft(scenario: Scenario): Draft {
  return {
    purchaseWhen: '',
    propertyFound: '',
    consultant: '',
    income: '',
    hasLoans: '',
    loanPayment: '',
    name: scenario.emptyProfile ? '' : 'Анна Сергеевна Иванова',
    email: scenario.emptyProfile ? '' : 'anna@example.com',
    phone: '+7 (900) 000-00-00',
    date: '',
    time: '',
    marketing: scenario.marketingGiven,
  };
}
export function needsConsultant(program: Program, property: Property) {
  return program === 'family' || property === 'new';
}
export function monthlyPayment(price: number, deposit: number, years: number, rate: number) {
  const principal = Math.max(0, price - deposit);
  if (!years || !principal) return 0;
  const months = years * 12;
  const monthlyRate = rate / 1200;
  return Math.round(
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months),
  );
}
// Tomorrow and the following two calendar days, in the same timezone as the call slots.
export function callbackDates(now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return [1, 2, 3].map((offset) => {
    const day = new Date(`${date}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + offset);
    return {
      value: day.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'short' })
        .format(day)
        .replace('.', ''),
      weekday:
        offset === 1
          ? 'Завтра'
          : new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', weekday: 'short' }).format(day),
    };
  });
}
export function fullDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00Z`));
}
export function validateStep(
  step: Step,
  draft: Draft,
  consultant: boolean,
  dates = callbackDates(),
): Errors {
  const errors: Errors = {};
  if (step === 1) {
    if (!draft.purchaseWhen) errors.purchaseWhen = 'Выберите, когда планируете покупку';
    if (!draft.propertyFound) errors.propertyFound = 'Расскажите, нашли ли вы квартиру';
    if (consultant && !draft.consultant) errors.consultant = 'Выберите, нужна ли помощь';
  }
  if (step === 2) {
    if (
      !draft.income ||
      !Number.isFinite(parseMoney(draft.income)) ||
      parseMoney(draft.income) <= 0
    )
      errors.income = 'Укажите ваш доход в месяц';
    if (!draft.hasLoans) errors.hasLoans = 'Выберите «Да» или «Нет»';
    if (
      draft.hasLoans === 'yes' &&
      (!draft.loanPayment ||
        !Number.isFinite(parseMoney(draft.loanPayment)) ||
        parseMoney(draft.loanPayment) <= 0)
    )
      errors.loanPayment = 'Укажите сумму ежемесячных платежей';
  }
  if (step === 3) {
    if (
      draft.name
        .trim()
        .split(/\s+/)
        .filter((part) => /\p{L}/u.test(part)).length < 2
    )
      errors.name = 'Укажите как минимум имя и фамилию';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
      errors.email = 'Проверьте почту, например anna@example.com';
  }
  if (step === 4) {
    if (!dates.some((day) => day.value === draft.date))
      errors.date = 'Выберите день из ближайших трёх';
    if (!timeSlots.includes(draft.time)) errors.time = 'Выберите удобное время звонка';
  }
  return errors;
}
export function buildApplication(
  draft: Draft,
  program: Program,
  property: Property,
  scenario: Scenario,
) {
  return {
    ...draft,
    name: draft.name.trim(),
    email: draft.email.trim(),
    income: parseMoney(draft.income),
    consultant: needsConsultant(program, property) ? draft.consultant : undefined,
    loanPayment: draft.hasLoans === 'yes' ? parseMoney(draft.loanPayment) : undefined,
    marketing: scenario.marketingGiven || draft.marketing,
    serviceConsent: true,
    program,
    property,
  };
}
