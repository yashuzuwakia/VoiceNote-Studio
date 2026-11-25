import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
} from 'react';
import { Upload } from 'lucide-react';

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="section-title">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function TextEdit({
  value,
  onCommit,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (!cancelled.current && draft !== value) onCommit(draft);
        cancelled.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          cancelled.current = true;
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
export function Choice<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <select
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
export function FileButton({
  label,
  accept,
  onFile,
  disabled,
}: {
  label: string;
  accept: string;
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        <Upload size={14} />
        {label}
      </button>
      <input
        hidden
        ref={input}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </>
  );
}
export function Wave({ peaks }: { peaks: number[] }) {
  return (
    <span className="wave" aria-hidden="true">
      {peaks.map((height, index) => (
        <i key={index} style={{ height: height * 100 + '%' }} />
      ))}
    </span>
  );
}
