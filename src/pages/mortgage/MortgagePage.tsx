import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Checkbox, Icon, Input, Modal } from '@/ui';
import {
  buildApplication,
  callbackDates,
  createDraft,
  defaultScenario,
  formatMoneyInput,
  fullDate,
  money,
  monthlyPayment,
  needsConsultant,
  parseMoney,
  steps,
  timeSlots,
  validateStep,
  type Draft,
  type Errors,
  type Program,
  type Property,
  type Scenario,
  type Step,
} from './model';
import s from './MortgagePage.module.css';

type GlyphName = 'arrow' | 'lock' | 'phone' | 'home' | 'clock' | 'sliders' | 'check';
function Glyph({ name, size = 22 }: { name: GlyphName; size?: number }) {
  const paths: Record<GlyphName, ReactNode> = {
    arrow: <path d="m14 5-7 7 7 7M7 12h15" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    phone: <path d="m8 3 2 5-3 2c2 4 3 5 7 7l2-3 5 2c1 5-2 6-5 5C8 19 5 16 3 8 2 5 3 2 8 3Z" />,
    home: (
      <>
        <path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-8h6v8" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h6m4 0h6M4 17h10m4 0h2" />
        <circle cx="12" cy="7" r="2" />
        <circle cx="16" cy="17" r="2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function ChoiceGroup({
  name,
  label,
  value,
  options,
  onChange,
  error,
  layout = 'list',
  hint,
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string; detail?: string }[];
  onChange: (value: string) => void;
  error?: string;
  layout?: 'list' | 'grid' | 'dates';
  hint?: string;
}) {
  return (
    <fieldset
      className={s.choiceGroup}
      aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
    >
      <legend>{label}</legend>
      {hint && (
        <p id={`${name}-hint`} className={s.fieldHint}>
          {hint}
        </p>
      )}
      <div className={`${s.choices} ${s[layout]}`}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`${s.choice} ${value === option.value ? s.selected : ''} ${error ? s.invalidChoice : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-invalid={!!error}
              aria-describedby={error ? `${name}-error` : undefined}
            />
            <span className={s.choiceText}>
              <span>{option.label}</span>
              {option.detail && <small>{option.detail}</small>}
            </span>
            {layout === 'list' && <span className={s.radioDot} aria-hidden="true" />}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className={s.error}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

function HomeDrawing() {
  return (
    <svg className={s.homeDrawing} viewBox="0 0 440 270" fill="none" aria-hidden="true">
      <path
        d="M45 230h355M95 230V86h176v144M271 230V125h68v105"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M81 86h204L183 29 81 86Z"
        fill="var(--surface-main-default)"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M113 107h64v68h-64zM193 107h59v68h-59zM116 126h58M145 107v68M196 126h53M223 107v68M148 230v-35h69v35M282 147h44v35h-44zM304 147v35M285 198h39M285 208h39"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M57 230v-45m-18-8c0-10 8-22 18-22s18 12 18 22c0 13-8 21-18 21s-18-8-18-21Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M364 230v-35m-13-6c0-8 5-17 13-17s13 9 13 17c0 10-5 15-13 15s-13-5-13-15Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="174"
        y="137"
        width="75"
        height="47"
        rx="23.5"
        transform="rotate(-12 174 137)"
        fill="var(--control-main-primary-default)"
      />
      <path
        d="m199 151 4 5 10-14"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="349" cy="55" r="18" fill="var(--surface-main-default)" />
      <path d="M362 102h28M376 88v28M73 42h12M79 36v12" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function MortgagePage() {
  const [scenario, setScenario] = useState<Scenario>(defaultScenario);
  const [settings, setSettings] = useState<Scenario>(defaultScenario);
  const [draft, setDraft] = useState<Draft>(() => createDraft(defaultScenario));
  const [view, setView] = useState<0 | Step | 'success'>(0);
  const [resumeStep, setResumeStep] = useState<Step>(1);
  const [program, setProgram] = useState<Program>('family');
  const [property, setProperty] = useState<Property>('new');
  const [price, setPrice] = useState('8 000 000');
  const [deposit, setDeposit] = useState('2 400 000');
  const [years, setYears] = useState(20);
  const [errors, setErrors] = useState<Errors>({});
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [calculatorError, setCalculatorError] = useState('');
  const [pending, setPending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [modal, setModal] = useState<'exit' | 'consents' | 'settings' | null>(null);
  const [application, setApplication] = useState<ReturnType<typeof buildApplication> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingRef = useRef(false);
  const initialView = useRef(true);
  const dates = callbackDates();
  const consultant = needsConsultant(program, property);
  const rate = program === 'family' ? 6 : 18;
  const payment = monthlyPayment(parseMoney(price), parseMoney(deposit), years, rate);
  const isForm = typeof view === 'number' && view > 0;
  const hasErrors = Object.keys(errors).length > 0;

  useEffect(() => {
    document.title = 'Ипотека с Циан · Короткая анкета';
    return () => {
      if (sendTimer.current) clearTimeout(sendTimer.current);
    };
  }, []);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (initialView.current) {
      initialView.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [view]);
  useEffect(() => {
    errorRef.current?.focus();
  }, [validationAttempt, sendError]);
  useEffect(() => {
    if (calculatorError)
      scrollRef.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus();
  }, [calculatorError]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === 'hasLoans' && value === 'no' ? { loanPayment: '' } : {}),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSendError(false);
  }
  function go(next: 0 | Step | 'success') {
    setErrors({});
    setSendError(false);
    setView(next);
    if (typeof next === 'number' && next > 0) setResumeStep(next as Step);
  }
  function start() {
    if (
      !price ||
      parseMoney(price) <= 0 ||
      !deposit ||
      parseMoney(deposit) < 0 ||
      parseMoney(deposit) >= parseMoney(price)
    ) {
      setCalculatorError('Укажите стоимость квартиры и взнос меньше её стоимости.');
      return;
    }
    setCalculatorError('');
    // A changed calculator context may introduce the conditional consultant question.
    go(consultant && !draft.consultant ? 1 : resumeStep);
  }
  function next() {
    if (!isForm || sendingRef.current) return;
    const found = validateStep(view as Step, draft, consultant);
    if (Object.keys(found).length) {
      setErrors(found);
      setValidationAttempt((attempt) => attempt + 1);
      return;
    }
    if (view !== 4) {
      go((Number(view) + 1) as Step);
      return;
    }
    // Recheck the whole draft before the simulated submission, including dates at midnight.
    for (const step of [1, 2, 3] as Step[]) {
      const earlier = validateStep(step, draft, consultant);
      if (Object.keys(earlier).length) {
        go(step);
        setErrors(earlier);
        setValidationAttempt((attempt) => attempt + 1);
        return;
      }
    }
    sendingRef.current = true;
    setPending(true);
    setSendError(false);
    sendTimer.current = setTimeout(() => {
      sendingRef.current = false;
      setPending(false);
      if (scenario.failOnce) {
        setScenario((current) => ({ ...current, failOnce: false }));
        setSendError(true);
        return;
      }
      setApplication(buildApplication(draft, program, property, scenario));
      go('success');
    }, 650);
  }
  function reset(nextScenario = scenario) {
    setDraft(createDraft(nextScenario));
    setResumeStep(1);
    setApplication(null);
    go(0);
  }
  const title =
    view === 0 ? (
      <>
        Ипотека для
        <br />
        ваших планов
      </>
    ) : view === 1 ? (
      <>
        Начнём с вашей
        <br />
        будущей квартиры
      </>
    ) : view === 2 ? (
      <>
        Найдём комфортный
        <br />
        платёж
      </>
    ) : view === 3 ? (
      <>
        Давайте
        <br />
        познакомимся
      </>
    ) : view === 4 ? (
      <>
        Когда вам
        <br />
        удобно поговорить?
      </>
    ) : (
      <>
        Вы на шаг ближе
        <br />к своему дому
      </>
    );

  return (
    <div className={s.stage}>
      <header className={s.desktopHeader}>
        <Link className={s.brand} to="/" aria-label="Циан — ипотека">
          <span className={s.brandMark}>Ц</span>
          <strong>циан</strong>
          <span className={s.brandDivider} /> <span>Ипотека</span>
        </Link>
        <Link className={s.kitLink} to="/ui-kit">
          Каталог компонентов <Icon name="ActionArrowUpRight16" size={16} />
        </Link>
      </header>
      <main className={s.stageBody}>
        <aside className={s.story}>
          <div className={s.storyLabel}>
            <span /> На пути к своему дому
          </div>
          <h2>
            Большие планы.
            <br />
            Простой первый шаг.
          </h2>
          <p className={s.storyIntro}>
            Расскажите о себе и будущей квартире.
            <br />С остальным поможет ипотечный эксперт.
          </p>
          <HomeDrawing />
          <div className={s.storyNote}>
            <span className={s.noteIcon}>
              <Glyph name="home" />
            </span>
            <p>
              Ваш дом начинается
              <br />
              <strong>с ваших пожеланий</strong>
            </p>
          </div>
          <div className={s.prototypeTools}>
            <span>Интерактивный прототип</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setSettings(scenario);
                setModal('settings');
              }}
            >
              <Glyph name="sliders" size={16} /> Сценарии
            </button>
          </div>
        </aside>
        <section className={s.device} aria-label="Мобильный прототип ипотеки">
          <header className={s.appHeader}>
            {isForm ? (
              <button
                className={s.iconButton}
                aria-label="Назад"
                disabled={pending}
                onClick={() => go(view === 1 ? 0 : ((Number(view) - 1) as Step))}
              >
                <Glyph name="arrow" />
              </button>
            ) : (
              <span className={s.smallBrand}>
                <span className={s.brandMark}>Ц</span>циан
              </span>
            )}
            <span className={s.appTitle}>{isForm ? 'Заявка на консультацию' : 'Ипотека'}</span>
            {isForm ? (
              <button
                className={s.iconButton}
                aria-label="Выйти из анкеты"
                disabled={pending}
                onClick={() => setModal('exit')}
              >
                <Icon name="ActionClose16" size={20} />
              </button>
            ) : (
              <button
                className={s.iconButton}
                aria-label="Сценарии прототипа"
                onClick={() => {
                  setSettings(scenario);
                  setModal('settings');
                }}
              >
                <Glyph name="sliders" />
              </button>
            )}
          </header>
          <div ref={scrollRef} className={s.screen}>
            {isForm && (
              <div
                className={s.progress}
                aria-label={`Шаг ${view} из 4: ${steps[Number(view) - 1]}`}
              >
                <div className={s.progressText}>
                  <span>{steps[Number(view) - 1]}</span>
                  <span>{view} из 4</span>
                </div>
                <div className={s.progressBars}>
                  {steps.map((name, index) => (
                    <span key={name} className={index < Number(view) ? s.filled : ''} />
                  ))}
                </div>
              </div>
            )}
            <div className={`${s.content} ${view === 'success' ? s.successContent : ''}`}>
              {view === 'success' && (
                <div className={s.successMark}>
                  <Glyph name="check" size={38} />
                </div>
              )}
              {view === 'success' && <p className={s.successLabel}>Заявка отправлена</p>}
              <h1 ref={headingRef} tabIndex={-1} className={s.title}>
                {title}
              </h1>
              <p className={s.subtitle}>
                {view === 0
                  ? 'Посчитайте платёж и подберите ипотеку с помощью эксперта.'
                  : view === 1
                    ? 'Пара вопросов, чтобы эксперт предложил то, что подходит именно вам.'
                    : view === 2
                      ? 'Укажите примерные суммы. Они помогут эксперту подобрать условия под ваш бюджет.'
                      : view === 3
                        ? 'Проверьте данные из профиля. По этому номеру с вами свяжется эксперт.'
                        : view === 4
                          ? 'Ипотечный эксперт партнёра Циана позвонит и поможет с дальнейшими шагами.'
                          : 'Ипотечный эксперт партнёра Циана свяжется с вами в выбранное время.'}
              </p>

              {view === 0 && (
                <div className={s.calculator}>
                  <ChoiceGroup
                    name="program"
                    label="Программа"
                    layout="grid"
                    value={program}
                    onChange={(value) => setProgram(value as Program)}
                    options={[
                      { value: 'family', label: 'Семейная' },
                      { value: 'standard', label: 'Базовая' },
                    ]}
                  />
                  <ChoiceGroup
                    name="property"
                    label="Какую квартиру рассматриваете?"
                    layout="grid"
                    value={property}
                    onChange={(value) => setProperty(value as Property)}
                    options={[
                      { value: 'new', label: 'Новостройка' },
                      { value: 'resale', label: 'Вторичка' },
                    ]}
                  />
                  <div className={s.calculatorFields}>
                    <Input
                      className={s.inputField}
                      label="Стоимость квартиры, ₽"
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => {
                        setPrice(formatMoneyInput(e.target.value));
                        setCalculatorError('');
                      }}
                    />
                    <Input
                      className={s.inputField}
                      label="Первоначальный взнос, ₽"
                      error={calculatorError || undefined}
                      inputMode="numeric"
                      value={deposit}
                      onChange={(e) => {
                        setDeposit(formatMoneyInput(e.target.value));
                        setCalculatorError('');
                      }}
                    />
                  </div>
                  <div className={s.termField}>
                    <label htmlFor="years">
                      Срок кредита <strong>{years} лет</strong>
                    </label>
                    <input
                      id="years"
                      type="range"
                      min="5"
                      max="30"
                      value={years}
                      onChange={(e) => setYears(Number(e.target.value))}
                      style={{ '--range-fill': `${(years - 5) * 4}%` } as CSSProperties}
                    />
                    <div>
                      <span>5 лет</span>
                      <span>30 лет</span>
                    </div>
                  </div>
                  <div className={s.paymentCard}>
                    <div className={s.paymentLabel}>
                      <span>Ежемесячный платёж</span>
                      <Glyph name="home" size={20} />
                    </div>
                    <div className={s.paymentAmount} aria-live="polite">
                      {money(payment)} <span>₽</span>
                    </div>
                    <div className={s.paymentDetails}>
                      <span>Ставка для расчёта</span>
                      <strong>{rate}% годовых</strong>
                    </div>
                    <p>Пример расчёта. Точные условия подберёт эксперт.</p>
                  </div>
                  <div className={s.supportNote}>
                    <Glyph name="clock" size={20} />
                    <span>Одна короткая анкета — и эксперт поможет с выбором ипотеки.</span>
                  </div>
                </div>
              )}

              {isForm && (
                <form
                  id="mortgage-form"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    next();
                  }}
                  className={s.form}
                >
                  <fieldset disabled={pending} className={s.formFields}>
                    {hasErrors && (
                      <div ref={errorRef} role="alert" tabIndex={-1} className={s.errorSummary}>
                        Проверьте выделенные поля, чтобы продолжить.
                      </div>
                    )}
                    {view === 1 && (
                      <>
                        <ChoiceGroup
                          name="purchaseWhen"
                          label="Когда планируете покупку?"
                          layout="grid"
                          value={draft.purchaseWhen}
                          onChange={(value) => update('purchaseWhen', value)}
                          error={errors.purchaseWhen}
                          options={[
                            { value: 'month', label: 'В течение месяца' },
                            { value: '1-3', label: 'Через 1–3 месяца' },
                            { value: '3-6', label: 'Через 3–6 месяцев' },
                            { value: 'exploring', label: 'Пока изучаю' },
                          ]}
                        />
                        <ChoiceGroup
                          name="propertyFound"
                          label="Уже нашли квартиру?"
                          value={draft.propertyFound}
                          onChange={(value) => update('propertyFound', value)}
                          error={errors.propertyFound}
                          options={[
                            { value: 'yes', label: 'Да, уже выбрали' },
                            { value: 'no', label: 'Нет, пока выбираю' },
                            { value: 'budget', label: 'Сначала хочу понять бюджет' },
                          ]}
                        />
                        {consultant && (
                          <ChoiceGroup
                            name="consultant"
                            label="Помочь с подбором квартиры?"
                            hint="Консультант предложит варианты под ваши пожелания."
                            layout="grid"
                            value={draft.consultant}
                            onChange={(value) => update('consultant', value)}
                            error={errors.consultant}
                            options={[
                              { value: 'yes', label: 'Да, нужна помощь' },
                              { value: 'no', label: 'Нет, спасибо' },
                            ]}
                          />
                        )}
                      </>
                    )}
                    {view === 2 && (
                      <>
                        <div className={s.incomeBlock}>
                          <Input
                            className={s.inputField}
                            label="Доход в месяц, ₽"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="Например, 100 000"
                            value={draft.income}
                            onChange={(e) => update('income', formatMoneyInput(e.target.value))}
                            error={errors.income}
                            hint="После вычета налогов, включая дополнительный доход"
                          />
                          <div className={s.quickAmounts} aria-label="Быстрый выбор дохода">
                            {[60000, 100000, 150000].map((value) => (
                              <button
                                type="button"
                                key={value}
                                aria-pressed={parseMoney(draft.income) === value}
                                onClick={() => update('income', money(value))}
                              >
                                {money(value)} ₽
                              </button>
                            ))}
                          </div>
                        </div>
                        <ChoiceGroup
                          name="hasLoans"
                          label="Есть действующие кредиты?"
                          hint="Включая рассрочки и платежи по кредитным картам."
                          layout="grid"
                          value={draft.hasLoans}
                          onChange={(value) => update('hasLoans', value)}
                          error={errors.hasLoans}
                          options={[
                            { value: 'yes', label: 'Да' },
                            { value: 'no', label: 'Нет' },
                          ]}
                        />
                        {draft.hasLoans === 'yes' && (
                          <Input
                            className={s.inputField}
                            label="Платежи по кредитам в месяц, ₽"
                            inputMode="numeric"
                            placeholder="Например, 15 000"
                            value={draft.loanPayment}
                            onChange={(e) =>
                              update('loanPayment', formatMoneyInput(e.target.value))
                            }
                            error={errors.loanPayment}
                            hint="Общая сумма по всем кредитам и рассрочкам"
                          />
                        )}
                        <div className={s.calmNote}>
                          <Glyph name="lock" />
                          <p>
                            На этом этапе достаточно ваших ответов. Документы о доходе не
                            понадобятся.
                          </p>
                        </div>
                      </>
                    )}
                    {view === 3 && (
                      <>
                        <div className={s.profileTag}>
                          <Icon name="ActionProfile24" size={20} /> Из профиля Циана
                        </div>
                        <Input
                          className={s.inputField}
                          label="Фамилия, имя и отчество"
                          autoComplete="name"
                          placeholder="Как к вам обращаться"
                          value={draft.name}
                          onChange={(e) => update('name', e.target.value)}
                          error={errors.name}
                          hint="Отчество — если есть"
                        />
                        <div className={s.lockedField}>
                          <Input
                            className={s.inputField}
                            label="Телефон"
                            type="tel"
                            autoComplete="tel"
                            value={draft.phone}
                            readOnly
                            hint="Подтверждён в профиле. Здесь его изменить нельзя."
                          />
                          <span className={s.lockIcon}>
                            <Glyph name="lock" size={18} />
                          </span>
                        </div>
                        <Input
                          className={s.inputField}
                          label="Электронная почта"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          placeholder="mail@example.com"
                          value={draft.email}
                          onChange={(e) => update('email', e.target.value)}
                          error={errors.email}
                          hint="Для информации по вашей заявке"
                        />
                      </>
                    )}
                    {view === 4 && (
                      <>
                        <ChoiceGroup
                          name="date"
                          label="День звонка"
                          layout="dates"
                          value={draft.date}
                          onChange={(value) => update('date', value)}
                          error={errors.date}
                          options={dates.map((day) => ({
                            value: day.value,
                            label: day.label,
                            detail: day.weekday,
                          }))}
                        />
                        <ChoiceGroup
                          name="time"
                          label="Время звонка"
                          hint="По московскому времени"
                          layout="grid"
                          value={draft.time}
                          onChange={(value) => update('time', value)}
                          error={errors.time}
                          options={timeSlots.map((time) => ({ value: time, label: time }))}
                        />
                        <div className={s.contactSummary}>
                          <span className={s.contactIcon}>
                            <Glyph name="phone" size={20} />
                          </span>
                          <div>
                            <span>Позвоним на номер</span>
                            <strong>{draft.phone}</strong>
                          </div>
                          <button type="button" className={s.textButton} onClick={() => go(3)}>
                            Данные
                          </button>
                        </div>
                        {!scenario.marketingGiven && (
                          <Checkbox
                            className={s.marketing}
                            label="Получать предложения и новости Циана"
                            checked={draft.marketing}
                            onChange={(e) => update('marketing', e.target.checked)}
                          />
                        )}
                        {sendError && (
                          <div className={s.sendError} ref={errorRef} role="alert" tabIndex={-1}>
                            <strong>Не удалось отправить заявку</strong>
                            <p>Ответы сохранены. Попробуйте отправить ещё раз.</p>
                          </div>
                        )}
                      </>
                    )}
                  </fieldset>
                </form>
              )}

              {view === 'success' && application && (
                <>
                  <div className={s.appointment}>
                    <div className={s.calendarTile}>
                      <span>
                        {new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', month: 'short' })
                          .format(new Date(`${application.date}T12:00:00Z`))
                          .replace('.', '')}
                      </span>
                      <strong>{Number(application.date.slice(-2))}</strong>
                    </div>
                    <div>
                      <strong>
                        {fullDate(application.date)}, {application.time}
                      </strong>
                      <span>По московскому времени</span>
                    </div>
                  </div>
                  <div className={s.successPhone}>
                    <Glyph name="phone" size={18} />
                    <span>{application.phone}</span>
                  </div>
                  <section className={s.whatsNext}>
                    <h2>Что будет дальше</h2>
                    <div>
                      <span>1</span>
                      <p>Обсудим ваши планы и ответим на вопросы об ипотеке.</p>
                    </div>
                    <div>
                      <span>2</span>
                      <p>Эксперт подберёт условия и поможет подготовить заявку в банк.</p>
                    </div>
                  </section>
                  <div className={s.calmNote}>
                    <Glyph name="home" />
                    <p>До звонка можно присмотреть квартиру своей мечты.</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <footer className={s.appFooter}>
            {view === 4 && (
              <p className={s.consentText}>
                Нажимая «Отправить заявку», вы принимаете{' '}
                <button type="button" disabled={pending} onClick={() => setModal('consents')}>
                  согласия на обработку и передачу данных
                </button>{' '}
                ипотечному партнёру для консультации.
              </p>
            )}
            {view === 0 ? (
              <>
                <Button
                  key="start"
                  size="L"
                  fullWidth
                  onClick={(event) => {
                    event.preventDefault();
                    start();
                  }}
                >
                  {resumeStep > 1 ? 'Продолжить анкету' : 'Подобрать ипотеку'}
                </Button>
                <span className={s.footerHint}>Короткая анкета · около 3 минут</span>
              </>
            ) : view === 'success' ? (
              <Button
                key="restart"
                size="L"
                theme="main_secondary"
                fullWidth
                onClick={() => reset()}
              >
                Вернуться к расчёту
              </Button>
            ) : (
              <>
                <Button
                  key="continue"
                  size="L"
                  fullWidth
                  type="submit"
                  form="mortgage-form"
                  loading={pending}
                >
                  {pending ? 'Отправляем заявку' : view === 4 ? 'Отправить заявку' : 'Продолжить'}
                </Button>
                <span className={s.footerHint}>
                  {view === 4
                    ? 'Консультация ни к чему не обязывает'
                    : 'Ответы сохраняются при переходе назад'}
                </span>
              </>
            )}
          </footer>
        </section>
      </main>
      <Modal open={modal === 'exit'} title="Вернуться к расчёту?" onClose={() => setModal(null)}>
        <div className={s.modalBody}>
          <p>
            Ваши ответы останутся в анкете, пока эта страница открыта. Вы сможете продолжить с того
            же шага.
          </p>
          <Button fullWidth onClick={() => setModal(null)}>
            Продолжить заполнение
          </Button>
          <Button
            fullWidth
            theme="main_secondary"
            onClick={() => {
              setModal(null);
              go(0);
            }}
          >
            К расчёту
          </Button>
        </div>
      </Modal>
      <Modal
        open={modal === 'consents'}
        title="Согласия для консультации"
        onClose={() => setModal(null)}
      >
        <div className={s.modalBody}>
          <p>
            Я разрешаю обработать данные этой анкеты и передать их ипотечному партнёру Циана, чтобы
            эксперт связался со мной и помог подобрать ипотеку.
          </p>
          <p>Получение рекламы — отдельный, необязательный выбор. Он не влияет на консультацию.</p>
          <small>
            Учебный пример текста согласия. В этом прототипе данные никуда не отправляются.
          </small>
          <Button fullWidth onClick={() => setModal(null)}>
            Понятно
          </Button>
        </div>
      </Modal>
      <Modal open={modal === 'settings'} title="Сценарии прототипа" onClose={() => setModal(null)}>
        <div className={s.modalBody}>
          <p>
            Демонстрационные данные. Отправка имитируется в браузере, ответы не передаются на
            сервер.
          </p>
          <ChoiceGroup
            name="profileScenario"
            label="Данные профиля"
            layout="grid"
            value={settings.emptyProfile ? 'empty' : 'filled'}
            onChange={(value) => setSettings({ ...settings, emptyProfile: value === 'empty' })}
            options={[
              { value: 'filled', label: 'Заполнены' },
              { value: 'empty', label: 'Имя и почта пустые' },
            ]}
          />
          <Checkbox
            label="Согласие на рекламу уже дано"
            checked={settings.marketingGiven}
            onChange={(e) => setSettings({ ...settings, marketingGiven: e.target.checked })}
          />
          <Checkbox
            label="Ошибка при первой отправке"
            checked={settings.failOnce}
            onChange={(e) => setSettings({ ...settings, failOnce: e.target.checked })}
          />
          <Button
            fullWidth
            onClick={() => {
              setScenario(settings);
              reset(settings);
              setModal(null);
            }}
          >
            Начать этот сценарий
          </Button>
          <Link className={s.modalKitLink} to="/ui-kit">
            Открыть каталог компонентов
          </Link>
        </div>
      </Modal>
    </div>
  );
}
