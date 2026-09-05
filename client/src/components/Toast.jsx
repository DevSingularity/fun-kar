/**
 * Toast/Notification Component
 * Display temporary notifications at the bottom of the screen
 * Use with a global toast manager context
 */

import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast = ({
	type = 'info',
	message = '',
	duration = 5000,
	onClose,
	id,
	className = '',
}) => {
	useEffect(() => {
		if (duration > 0) {
			const timer = setTimeout(() => onClose(id), duration);
			return () => clearTimeout(timer);
		}
	}, [duration, id, onClose]);

	const typeStyles = {
		success: {
			bg: 'bg-emerald-50',
			border: 'border-emerald-200',
			text: 'text-emerald-800',
			icon: CheckCircle2,
			iconColor: 'text-emerald-600',
			iconBg: 'bg-emerald-100',
		},
		error: {
			bg: 'bg-rose-50',
			border: 'border-rose-200',
			text: 'text-rose-800',
			icon: XCircle,
			iconColor: 'text-rose-600',
			iconBg: 'bg-rose-100',
		},
		warning: {
			bg: 'bg-amber-50',
			border: 'border-amber-200',
			text: 'text-amber-800',
			icon: AlertTriangle,
			iconColor: 'text-amber-600',
			iconBg: 'bg-amber-100',
		},
		info: {
			bg: 'bg-blue-50',
			border: 'border-blue-200',
			text: 'text-blue-800',
			icon: Info,
			iconColor: 'text-blue-600',
			iconBg: 'bg-blue-100',
		},
	};

	const styles = typeStyles[type] || typeStyles.info;
	const IconComponent = styles.icon;

	return (
		<div className={`${styles.bg} ${styles.border} border rounded-lg p-3.5 flex gap-3 items-center max-w-md shadow-md animate-in fade-in slide-in-from-bottom ${className}`}>
			<div className={`${styles.iconBg} rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0`}>
				<IconComponent className={`h-4 w-4 ${styles.iconColor}`} />
			</div>
			<p className={`${styles.text} text-xs font-semibold flex-1 leading-snug`}>{message}</p>
			<button onClick={() => onClose(id)} className={`${styles.text} p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 transition-opacity flex-shrink-0`}>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
};

export default Toast;
