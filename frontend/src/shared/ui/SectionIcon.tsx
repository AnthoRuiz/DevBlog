import { FC } from 'react';
import { Code2, Cpu, Gamepad2, Heart, LucideProps, Target } from 'lucide-react';

// Maps the backend's section icon keys to lucide icons
const ICONS: Record<string, FC<LucideProps>> = {
  code: Code2,
  cpu: Cpu,
  target: Target,
  heart: Heart,
  gamepad: Gamepad2,
};

export const SectionIcon: FC<{ icon: string } & LucideProps> = ({ icon, ...props }) => {
  const Icon = ICONS[icon] ?? Code2;
  return <Icon aria-hidden="true" {...props} />;
};
