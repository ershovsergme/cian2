import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MortgagePage } from './MortgagePage';
import {
  buildApplication,
  callbackDates,
  createDraft,
  defaultScenario,
  monthlyPayment,
  validateStep,
} from './model';

function setup() {
  render(
    <MemoryRouter>
      <MortgagePage />
    </MemoryRouter>,
  );
  return userEvent.setup();
}
async function next(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Продолжить' }));
}
async function plans(user: ReturnType<typeof userEvent.setup>, consultant = true) {
  await user.click(screen.getByRole('button', { name: 'Подобрать ипотеку' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await user.click(screen.getByLabelText('Через 1–3 месяца'));
  await user.click(screen.getByLabelText('Нет, пока выбираю'));
  if (consultant) await user.click(screen.getByLabelText('Да, нужна помощь'));
  await next(user);
}

describe('Mortgage prototype', () => {
  it('completes the family mortgage flow, preserves answers on back, and confirms the chosen call', async () => {
    const user = setup();
    await plans(user);
    await user.click(screen.getByRole('button', { name: /100\s000 ₽/ }));
    await user.click(screen.getByLabelText('Да', { exact: true }));
    await next(user);
    expect(screen.getByText('Укажите сумму ежемесячных платежей')).toBeVisible();
    await user.type(screen.getByLabelText('Платежи по кредитам в месяц, ₽'), '15000');
    await next(user);
    expect(screen.getByLabelText('Телефон')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Фамилия, имя и отчество')).toHaveValue('Анна Сергеевна Иванова');
    await user.click(screen.getByRole('button', { name: 'Назад' }));
    expect(screen.getByLabelText('Платежи по кредитам в месяц, ₽')).toHaveValue('15\u00a0000');
    await next(user);
    await next(user);
    expect(screen.getByLabelText('Получать предложения и новости Циана')).not.toBeChecked();
    const tomorrow = within(screen.getByRole('group', { name: 'День звонка' })).getAllByRole(
      'radio',
    )[0];
    await user.click(tomorrow);
    await user.click(screen.getByLabelText('12:00'));
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));
    expect(screen.getByRole('button', { name: /Отправляем заявку/ })).toBeDisabled();
    expect(screen.getByLabelText('14:00')).toBeDisabled();
    await waitFor(() => expect(screen.getByText('Заявка отправлена')).toBeVisible());
    expect(screen.getByText(/, 12:00$/)).toBeVisible();
    expect(screen.getByText('+7 (900) 000-00-00')).toBeVisible();
  });

  it('validates empty contacts without stealing focus while the user corrects them', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Сценарии прототипа' }));
    await user.click(screen.getByLabelText('Имя и почта пустые'));
    await user.click(screen.getByRole('button', { name: 'Начать этот сценарий' }));
    await plans(user);
    await user.click(screen.getByRole('button', { name: /60\s000 ₽/ }));
    await user.click(screen.getByLabelText('Нет', { exact: true }));
    await next(user);
    await next(user);
    expect(screen.getByText('Укажите как минимум имя и фамилию')).toBeVisible();
    const name = screen.getByLabelText('Фамилия, имя и отчество');
    await user.type(name, 'Мария Петрова');
    expect(name).toHaveValue('Мария Петрова');
    expect(name).toHaveFocus();
    await user.type(screen.getByLabelText('Электронная почта'), 'maria@example.com');
    await next(user);
    expect(screen.getByRole('group', { name: 'День звонка' })).toBeVisible();
  });

  it('hides inapplicable questions and retries a failed submission without losing the schedule', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Сценарии прототипа' }));
    await user.click(screen.getByLabelText('Согласие на рекламу уже дано'));
    await user.click(screen.getByLabelText('Ошибка при первой отправке'));
    await user.click(screen.getByRole('button', { name: 'Начать этот сценарий' }));
    await user.click(screen.getByLabelText('Базовая'));
    await user.click(screen.getByLabelText('Вторичка'));
    await plans(user, false);
    await user.click(screen.getByRole('button', { name: /150\s000 ₽/ }));
    await user.click(screen.getByLabelText('Да', { exact: true }));
    await user.type(screen.getByLabelText('Платежи по кредитам в месяц, ₽'), '10000');
    await user.click(screen.getByLabelText('Нет', { exact: true }));
    expect(screen.queryByLabelText('Платежи по кредитам в месяц, ₽')).not.toBeInTheDocument();
    await next(user);
    await next(user);
    expect(screen.queryByLabelText('Получать предложения и новости Циана')).not.toBeInTheDocument();
    await user.click(
      within(screen.getByRole('group', { name: 'День звонка' })).getAllByRole('radio')[1],
    );
    await user.click(screen.getByLabelText('16:00'));
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));
    expect(await screen.findByText('Не удалось отправить заявку')).toBeVisible();
    expect(screen.getByLabelText('16:00')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));
    expect(await screen.findByText('Заявка отправлена')).toBeVisible();
  });

  it('shows the conditional consultant question for a new build and resumes an exited draft', async () => {
    const user = setup();
    await user.click(screen.getByLabelText('Базовая'));
    await plans(user);
    await user.click(screen.getByRole('button', { name: /100\s000 ₽/ }));
    await user.click(screen.getByRole('button', { name: 'Выйти из анкеты' }));
    await user.click(screen.getByRole('button', { name: 'К расчёту' }));
    await user.click(screen.getByRole('button', { name: 'Продолжить анкету' }));
    expect(screen.getByLabelText('Доход в месяц, ₽')).toHaveValue('100\u00a0000');
    await user.click(screen.getByRole('button', { name: 'Назад' }));
    expect(screen.getByRole('group', { name: 'Помочь с подбором квартиры?' })).toBeVisible();
    expect(screen.getByLabelText('Да, нужна помощь')).toBeChecked();
  });
});

describe('Mortgage calculation and submission boundaries', () => {
  it('uses calendar days across a year boundary in Moscow and rejects expired/invalid slots', () => {
    const dates = callbackDates(new Date('2026-12-31T22:30:00Z'));
    expect(dates.map((date) => date.value)).toEqual(['2027-01-02', '2027-01-03', '2027-01-04']);
    const draft = { ...createDraft(defaultScenario), date: '2027-01-01', time: '03:00' };
    expect(validateStep(4, draft, true, dates)).toHaveProperty('date');
    expect(validateStep(4, draft, true, dates)).toHaveProperty('time');
  });
  it('calculates an annuity and handles an interest-free calculation', () => {
    expect(monthlyPayment(8000000, 2400000, 20, 6)).toBe(40120);
    expect(monthlyPayment(1200000, 0, 10, 0)).toBe(10000);
    expect(monthlyPayment(100, 100, 20, 6)).toBe(0);
  });
  it('excludes hidden answers and retains previously given marketing consent', () => {
    const draft = {
      ...createDraft(defaultScenario),
      consultant: 'yes',
      income: '100 000',
      hasLoans: 'no',
      loanPayment: '20 000',
      marketing: false,
    };
    const result = buildApplication(draft, 'standard', 'resale', {
      ...defaultScenario,
      marketingGiven: true,
    });
    expect(result.consultant).toBeUndefined();
    expect(result.loanPayment).toBeUndefined();
    expect(result.income).toBe(100000);
    expect(result.marketing).toBe(true);
  });
});
