export default function joinClasses(...args): string {
  return args.filter(Boolean).join(' ');
}
