type SkeletonSize = "sm" | "md" | "lg";

const sizeClasses: Record<SkeletonSize, string> = {
  sm: "h-7",
  md: "h-8",
  lg: "h-9",
};

export default function Skeleton({ size }: { size: SkeletonSize }) {
  return (
    <div
      className={`w-full animate-pulse rounded-md bg-skeleton ${sizeClasses[size]}`}
    />
  );
}
