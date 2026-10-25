'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Copy,
  FileText,
  ImagePlus,
  Info,
  Loader2,
  MailCheck,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { prepareSlipUpload, type PreparedSlip } from '@/lib/image-client';
import { makeRefCode } from '@/lib/codes';
import { STUDENT_ID_EXAMPLE } from '@/lib/validation';
import { EVENT, TICKET_CATEGORIES, type Category } from '@/config/event';

const STUDENT_ID_RE = /^[A-Za-z]{2,4}-[A-Za-z]{2,4}-\d{2}-\d{2}-\d{4}$/;
/** sessionStorage key for the in-progress payment reference — survives dialog
 *  close/reopen and page reloads, cleared once a registration succeeds. */
const PAYMENT_REF_KEY = 'ee-payment-ref';

type Fields = { fullName: string; email: string; phone: string; studentId: string };
type FieldErrors = Partial<Record<keyof Fields | 'slip' | 'form', string>>;

const EMPTY: Fields = { fullName: '', email: '', phone: '', studentId: '' };

export function RegisterDialog({
  open,
  onOpenChange,
  initialCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: Category;
}) {
  const [category, setCategory] = useState<Category>(initialCategory ?? 'Lyceum Campus Student');
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [slip, setSlip] = useState<PreparedSlip | null>(null);
  const [slipBusy, setSlipBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  /** Unique reference shown BEFORE paying so it can go on the bank transfer. */
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileKeyRef = useRef(0);

  const activeCat = TICKET_CATEGORIES.find((c) => c.id === category)!;
  const bankReady = Boolean(
    EVENT.payment.bankName && EVENT.payment.accountName && EVENT.payment.accountNumber
  );

  // reset shortly after close so the exit animation stays clean
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setSuccess(null);
      setErrors({});
      setSlip(null);
      setFields(EMPTY);
      setSubmitting(false);
      setSlipBusy(false);
    }, 350);
    return () => clearTimeout(t);
  }, [open]);

  // sync category when reopened with a preselection
  useEffect(() => {
    if (open && initialCategory) setCategory(initialCategory);
  }, [open, initialCategory]);

  // Assign a payment reference when the form opens. It persists in
  // sessionStorage until a registration succeeds, so closing the dialog
  // (or reloading) after paying does not change the number on the slip.
  useEffect(() => {
    if (!open || success || paymentRef) return;
    const saved = window.sessionStorage.getItem(PAYMENT_REF_KEY);
    if (saved && /^EE-\d{6}$/.test(saved)) {
      setPaymentRef(saved);
    } else {
      const ref = makeRefCode();
      window.sessionStorage.setItem(PAYMENT_REF_KEY, ref);
      setPaymentRef(ref);
    }
  }, [open, success, paymentRef]);

  function set(field: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
  }

  async function onPickFile(file?: File | null) {
    if (!file) return;
    setErrors((e) => ({ ...e, slip: undefined, form: undefined }));
    setSlipBusy(true);
    try {
      const prepared = await prepareSlipUpload(file);
      setSlip(prepared);
    } catch (err) {
      setErrors((e) => ({
        ...e,
        slip: err instanceof Error ? err.message : 'Could not read that file.',
      }));
    } finally {
      setSlipBusy(false);
      fileKeyRef.current += 1;
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (fields.fullName.trim().length < 2) e.fullName = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
      e.email = 'Please enter a valid email.';
    if (!/^[+]?[\d][\d\s\-()]{6,19}$/.test(fields.phone.trim()))
      e.phone = 'Please enter a valid phone number.';
    if (activeCat.requiresStudentId && !STUDENT_ID_RE.test(fields.studentId.trim()))
      e.studentId = `Use the format on your student card, e.g. ${STUDENT_ID_EXAMPLE}.`;
    if (!slip) e.slip = 'Please attach your payment slip.';
    return e;
  }

  async function submit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fields.fullName.trim(),
          email: fields.email.trim(),
          phone: fields.phone.trim(),
          category,
          studentId: activeCat.requiresStudentId ? fields.studentId.trim() : null,
          slipBase64: slip!.dataUrl,
          slipFileName: slip!.fileName,
          paymentRef,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        refCode?: string;
        error?: string;
      };
      if (!res.ok || !data.refCode) {
        setErrors((prev) => ({ ...prev, form: data.error || 'Registration failed. Please try again.' }));
        toast.error(data.error || 'Registration failed. Please try again.');
        return;
      }
      setSuccess(data.refCode);
      // A fresh registration in this browser gets a fresh payment reference.
      window.sessionStorage.removeItem(PAYMENT_REF_KEY);
      setPaymentRef(null);
      toast.success('Registration received!');
    } catch {
      setErrors((prev) => ({ ...prev, form: 'Network error — please check your connection.' }));
      toast.error('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'h-11 bg-card';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-none gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Workshop registration</DialogTitle>
        <DialogDescription className="sr-only">
          Register for the Etiquette Essentials workshop.
        </DialogDescription>

        {success ? (
          <SuccessPanel refCode={success} onDone={() => onOpenChange(false)} />
        ) : (
          <div className="max-h-[85vh] overflow-y-auto">
            {/* header */}
            <div className="border-b border-border/80 bg-secondary/40 px-6 py-5 pr-14">
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-brand">
                Registration · {EVENT.date.short}
              </p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-foreground">
                Reserve your seat
              </h3>
            </div>

            <div className="space-y-7 px-6 py-6">
              {/* 1 · category */}
              <fieldset>
                <legend className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  1 · Choose your ticket
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {TICKET_CATEGORIES.map((c) => {
                    const selected = c.id === category;
                    return (
                      <label
                        key={c.id}
                        className={`relative cursor-pointer rounded-lg border p-4 transition-all ${
                          selected
                            ? 'border-brand bg-brand/10 ring-1 ring-brand'
                            : 'border-border bg-card hover:border-brand/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="ticket-category"
                          value={c.id}
                          checked={selected}
                          onChange={() => {
                            setCategory(c.id);
                            setErrors({});
                          }}
                          className="sr-only"
                        />
                        <span className="block text-sm font-medium text-foreground">
                          {c.label === 'Lyceum Campus Student' ? 'Student' : 'External'}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {c.id === 'Lyceum Campus Student'
                            ? 'Lyceum Campus students'
                            : 'Guests from outside campus'}
                        </span>
                        <span className="mt-2.5 block font-display text-2xl font-bold text-foreground">
                          Rs. {c.price}
                        </span>
                        {selected ? (
                          <span
                            className="absolute right-3 top-3 text-brand"
                            aria-hidden="true"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* 2 · payment */}
              <section aria-label="Payment details">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  2 · Pay Rs. {activeCat.price}
                </p>
                {bankReady ? (
                  <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-secondary/40 p-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">{EVENT.payment.bankName}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Account name</span>
                      <span className="font-medium">{EVENT.payment.accountName}</span>
                    </div>
                    {EVENT.payment.branch ? (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Branch</span>
                        <span className="font-medium">{EVENT.payment.branch}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Account no.</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {EVENT.payment.accountNumber}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-brand"
                          aria-label="Copy account number"
                          onClick={() => {
                            navigator.clipboard
                              ?.writeText(EVENT.payment.accountNumber)
                              .then(() => toast('Account number copied'))
                              .catch(() => {});
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm leading-relaxed text-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                    <p>
                      <span className="font-medium">Account details coming soon.</span>{' '}
                      <span className="text-muted-foreground">
                        Please confirm the account number with a BEd Intake 5 committee member
                        before paying.
                      </span>
                    </p>
                  </div>
                )}

                {/* unique payment reference */}
                <div className="mt-3 rounded-lg border border-brand/50 bg-brand/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brand">
                    Your payment reference
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="font-mono text-2xl font-bold tracking-[0.1em] text-foreground">
                      {paymentRef ?? '…'}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-brand"
                      aria-label="Copy payment reference"
                      onClick={() => {
                        if (!paymentRef) return;
                        navigator.clipboard
                          ?.writeText(paymentRef)
                          .then(() => toast('Payment reference copied'))
                          .catch(() => {});
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Add this number as the payment reference on your bank transfer. It is unique
                    to you — the committee uses it to match your slip to your registration.
                  </p>
                </div>
              </section>

              {/* 3 · details */}
              <section aria-label="Your details">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  3 · Your details
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="reg-name" className="text-sm">
                      Full name
                    </Label>
                    <Input
                      id="reg-name"
                      className={`mt-1.5 ${inputCls}`}
                      placeholder="e.g. Amaya Fernando"
                      value={fields.fullName}
                      onChange={(e) => set('fullName', e.target.value)}
                      autoComplete="name"
                    />
                    {errors.fullName ? (
                      <p className="mt-1.5 text-xs text-destructive">{errors.fullName}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="reg-email" className="text-sm">
                      Email
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      className={`mt-1.5 ${inputCls}`}
                      placeholder="you@example.com"
                      value={fields.email}
                      onChange={(e) => set('email', e.target.value)}
                      autoComplete="email"
                    />
                    {errors.email ? (
                      <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="reg-phone" className="text-sm">
                      Phone
                    </Label>
                    <Input
                      id="reg-phone"
                      type="tel"
                      className={`mt-1.5 ${inputCls}`}
                      placeholder="+94 7X XXX XXXX"
                      value={fields.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      autoComplete="tel"
                    />
                    {errors.phone ? (
                      <p className="mt-1.5 text-xs text-destructive">{errors.phone}</p>
                    ) : null}
                  </div>
                  {activeCat.requiresStudentId ? (
                    <div className="sm:col-span-2">
                      <Label htmlFor="reg-sid" className="text-sm">
                        Student ID
                      </Label>
                      <Input
                        id="reg-sid"
                        className={`mt-1.5 font-mono ${inputCls}`}
                        placeholder={STUDENT_ID_EXAMPLE}
                        value={fields.studentId}
                        onChange={(e) => set('studentId', e.target.value)}
                        autoCapitalize="characters"
                        spellCheck={false}
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Format: {STUDENT_ID_EXAMPLE} — as printed on your Lyceum student card.
                      </p>
                      {errors.studentId ? (
                        <p className="mt-1.5 text-xs text-destructive">{errors.studentId}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>

              {/* 4 · slip */}
              <section aria-label="Payment slip upload">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  4 · Payment slip
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Your slip should show the amount and your reference{' '}
                  <span className="font-mono font-medium text-foreground">{paymentRef}</span>.
                </p>
                {!slip ? (
                  <>
                    <label
                      htmlFor="reg-slip"
                      className="mt-3 flex cursor-pointer flex-col items-center gap-2.5 rounded-lg border border-dashed border-border bg-card px-6 py-8 text-center transition-colors hover:border-brand hover:bg-brand/5"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        onPickFile(e.dataTransfer.files?.[0]);
                      }}
                    >
                      {slipBusy ? (
                        <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden="true" />
                      ) : (
                        <ImagePlus className="h-6 w-6 text-brand" aria-hidden="true" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {slipBusy ? 'Preparing file…' : 'Tap to upload your slip'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        JPG · PNG · WebP image or PDF (max 3 MB)
                      </span>
                      <input
                        ref={fileRef}
                        id="reg-slip"
                        key={fileKeyRef.current}
                        type="file"
                        accept="image/*,application/pdf,.pdf"
                        className="sr-only"
                        onChange={(e) => onPickFile(e.target.files?.[0])}
                      />
                    </label>
                    {errors.slip ? (
                      <p className="mt-1.5 text-xs text-destructive">{errors.slip}</p>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-3 flex items-center gap-4 rounded-lg border border-brand/50 bg-brand/5 p-3">
                    {slip.kind === 'pdf' ? (
                      <span className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-border bg-card text-brand">
                        <FileText className="h-7 w-7" aria-hidden="true" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                          PDF
                        </span>
                      </span>
                    ) : (
                      <img
                        src={slip.dataUrl}
                        alt="Payment slip preview"
                        className="h-20 w-20 rounded-md border border-border object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {slip.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ready · {(slip.dataUrl.length / 1024).toFixed(0)} KB
                        {slip.kind === 'pdf' ? ' · PDF' : ''}
                      </p>
                      <div className="mt-2 flex gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline decoration-brand/60 underline-offset-4 hover:text-brand"
                          onClick={() => fileRef.current?.click()}
                        >
                          <RefreshCw className="h-3 w-3" aria-hidden="true" /> Replace
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-medium text-destructive underline decoration-destructive/50 underline-offset-4 hover:text-destructive"
                          onClick={() => setSlip(null)}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" /> Remove
                        </button>
                      </div>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,application/pdf,.pdf"
                      className="sr-only"
                      onChange={(e) => onPickFile(e.target.files?.[0])}
                    />
                  </div>
                )}
              </section>

              {errors.form ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {errors.form}
                </p>
              ) : null}

              <Button
                onClick={submit}
                disabled={submitting || slipBusy}
                className="h-12 w-full rounded-full bg-brand text-[11px] font-bold uppercase tracking-[0.22em] text-white hover:bg-brand-strong"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Submitting…
                  </>
                ) : (
                  'Submit registration'
                )}
              </Button>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Your reference code appears instantly. Your QR ticket is emailed after the
                committee verifies your slip.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SuccessPanel({ refCode, onDone }: { refCode: string; onDone: () => void }) {
  const NEXT = [
    { icon: ShieldCheck, text: 'The committee verifies your payment slip' },
    { icon: MailCheck, text: 'Your QR ticket is emailed to you' },
    { icon: QrCode, text: 'Scan it at the entrance on the day' },
  ];
  return (
    <div className="px-6 py-10 text-center sm:px-10">
      <CheckCircle2 className="mx-auto h-12 w-12 text-brand" aria-hidden="true" />
      <h3 className="mt-4 font-display text-3xl font-semibold text-foreground">
        You’re on the list!
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        We’ve received your registration and payment slip. This is the same reference you added
        to your payment — keep it for any inquiries:
      </p>
      <div className="mx-auto mt-5 max-w-xs rounded-lg border border-brand/50 bg-brand/10 px-6 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand">
          Reference code
        </p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.12em] text-foreground">
          {refCode}
        </p>
      </div>
      <ul className="mx-auto mt-7 max-w-xs space-y-3 text-left">
        {NEXT.map((n) => (
          <li key={n.text} className="flex items-center gap-3 text-sm text-muted-foreground">
            <n.icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            {n.text}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Badge variant="outline" className="border-brand/50 bg-brand/10 text-[10px] uppercase tracking-[0.2em] text-brand">
          {EVENT.date.long} · {EVENT.time.display}
        </Badge>
        <Button
          variant="outline"
          onClick={onDone}
          className="mt-2 h-11 w-full max-w-xs rounded-full border-border text-[11px] font-semibold uppercase tracking-[0.22em] hover:border-brand hover:bg-brand/10"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
