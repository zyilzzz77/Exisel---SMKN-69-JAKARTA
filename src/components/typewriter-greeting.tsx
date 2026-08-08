"use client";

import { TypewriterHeading } from "./typewriter-heading";

type TypewriterGreetingProps = {
  className?: string;
  id?: string;
  name: string;
  prefix?: string;
};

export function TypewriterGreeting({
  className,
  id,
  name,
  prefix = "Halo,",
}: TypewriterGreetingProps) {
  return (
    <TypewriterHeading
      className={className}
      highlightText={`${name.trim()}!`}
      id={id}
      lineBreak={false}
      mainText={prefix.trim()}
    />
  );
}
