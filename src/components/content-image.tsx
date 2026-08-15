/* eslint-disable @next/next/no-img-element */

type ContentImageProps = {
  alt: string;
  className?: string;
  src: string;
};

export function ContentImage({ alt, className, src }: ContentImageProps) {
  return <img alt={alt} className={className} loading="lazy" src={src} />;
}
