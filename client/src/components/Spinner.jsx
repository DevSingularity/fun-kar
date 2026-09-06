/**
 * Spinner Component
 * High-contrast, sleek Odoo-themed dual-tone loading indicator
 */

export const Spinner = ({
	size = 'md',
	variant = 'primary',
	label = '',
	fullScreen = false,
	className = '',
}) => {
	const sizeMap = {
		xs: 'h-3.5 w-3.5',
		sm: 'h-4 w-4',
		md: 'h-6 w-6',
		lg: 'h-10 w-10',
		xl: 'h-14 w-14',
	};

	const strokeMap = {
		xs: 3,
		sm: 3,
		md: 3,
		lg: 2.5,
		xl: 2,
	};

	const colorClasses = {
		primary: 'text-[#714b67]',
		secondary: 'text-[#008784]',
		white: 'text-white',
		slate: 'text-slate-600',
	};

	const chosenSize = sizeMap[size] || sizeMap.md;
	const strokeWidth = strokeMap[size] || 3;
	const chosenColor = colorClasses[variant] || colorClasses.primary;

	const spinnerSvg = (
		<svg
			className={`animate-spin ${chosenSize} ${chosenColor} ${className}`}
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle
				className="opacity-20"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth={strokeWidth}
			/>
			<path
				className="opacity-90"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			/>
		</svg>
	);

	if (fullScreen) {
		return (
			<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-xs">
				<div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
					{spinnerSvg}
					{label && <p className="text-xs font-bold text-slate-700">{label}</p>}
				</div>
			</div>
		);
	}

	if (label) {
		return (
			<div className="inline-flex items-center gap-2.5">
				{spinnerSvg}
				<span className="text-xs font-semibold text-slate-600">{label}</span>
			</div>
		);
	}

	return spinnerSvg;
};

/**
 * Inline section / card loader with mild pulse and spinner
 */
export const InlineLoader = ({ label = 'Loading...', className = 'py-12' }) => {
	return (
		<div className={`flex flex-col items-center justify-center gap-3 text-center ${className}`}>
			<Spinner size="md" variant="primary" />
			<p className="text-xs font-medium text-slate-500 animate-pulse">{label}</p>
		</div>
	);
};

export default Spinner;
