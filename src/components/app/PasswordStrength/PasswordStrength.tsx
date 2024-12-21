import { Banner, Label } from "@/components/common";
import { composeTailwindRenderProps } from "@/components/utils";
import {
  Meter as AriaMeter,
  type MeterProps as AriaMeterProps,
} from "react-aria-components";

export interface MeterProps extends AriaMeterProps {
  value: number;
  warning?: string;
  suggestions?: string[];
}

type StrengthConfig = {
  label: string;
  color: {
    text: string;
    bg: string;
  };
};

export const strengthConfig: Record<number, StrengthConfig> = {
  0: {
    label: "Very weak",
    color: {
      text: "text-red-9 dark:text-reddark-9",
      bg: "bg-transparent",
    },
  },
  1: {
    label: "Weak",
    color: {
      text: "text-red-9 dark:text-reddark-9",
      bg: "bg-red-9 dark:bg-reddark-9",
    },
  },
  2: {
    label: "Okay",
    color: {
      text: "text-gray-normal",
      bg: "bg-amber-9 dark:bg-amberdark-9",
    },
  },
  3: {
    label: "Good",
    color: {
      text: "text-gray-normal",
      bg: "bg-grass-9 dark:bg-grassdark-9",
    },
  },
  4: {
    label: "Great!",
    color: {
      text: "text-green-10 dark:text-greendark-10",
      bg: "bg-green-9 dark:bg-greendark-9",
    },
  },
};

export function PasswordStrength({
  value,
  warning,
  suggestions,
  ...props
}: MeterProps) {
  if (value < 0 || value > 4) {
    throw new Error("Value must be between 0 and 4");
  }

  return (
    <div className="flex flex-col gap-3">
      <AriaMeter
        {...props}
        className={composeTailwindRenderProps(
          props.className,
          "flex flex-col gap-1",
        )}
        value={value}
        minValue={0}
        maxValue={4}
      >
        {({ percentage }) => (
          <>
            <div className="w-full min-w-64 h-2 rounded-full bg-gray-4 dark:bg-graydark-4 outline outline-1 -outline-offset-1 outline-transparent relative overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full w-full rounded-full ${strengthConfig[value].color.bg} transition-all forced-colors:bg-[Highlight]`}
                style={{ translate: `-${100 - percentage}%` }}
                data-testid="meter-fill"
              />
            </div>
            <div className="flex justify-between gap-2">
              <Label className="text-gray-dim">Password Strength</Label>
              <span
                className={`text-sm font-medium ${strengthConfig[value].color.text}`}
              >
                {strengthConfig[value].label}
              </span>
            </div>
          </>
        )}
      </AriaMeter>
      {warning && <Banner variant="danger">{warning}</Banner>}
      {suggestions && (
        <Banner variant="info">
          <p>
            <span>To fix this:</span>
            <br />
            <ul className="list-disc list-inside">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </p>
        </Banner>
      )}
    </div>
  );
}
