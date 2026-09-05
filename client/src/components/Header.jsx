import { Link } from 'react-router-dom';

/**
 * Header Component
 * Top navigation bar with logo, nav items, and user menu
 */

const Header = ({
	logo = 'DealFlow360',
	logoHref = '/',
	navItems = [],
	userMenu = null,
	onLogoClick = null,
	position = 'sticky',
	className = '',
	style,
}) => {
	const positionClass = position === 'fixed' ? 'fixed inset-x-0 top-0' : 'sticky top-0';

	const brand = onLogoClick ? (
		<button
			type='button'
			className='flex items-center gap-2.5 logo-brand group'
			onClick={onLogoClick}
		>
			<img src='/logo.svg' alt='DealFlow360' className='h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-105' />
			<div className="flex items-baseline font-bold tracking-tight text-lg">
				<span className="text-(--app-color-primary)">DealFlow</span>
				<span className="text-(--app-color-accent) font-extrabold ml-0.5">360</span>
			</div>
		</button>
	) : (
		<Link to={logoHref} className='flex items-center gap-2.5 logo-brand group'>
			<img src='/logo.svg' alt='DealFlow360' className='h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-105' />
			<div className="flex items-baseline font-bold tracking-tight text-lg">
				<span className="text-(--app-color-primary)">DealFlow</span>
				<span className="text-(--app-color-accent) font-extrabold ml-0.5">360</span>
			</div>
		</Link>
	);

	return (
		<header
			className={`${positionClass} z-50 border-b border-(--app-color-border) shadow-xs ${className}`}
			style={{
				backdropFilter: 'blur(16px)',
				backgroundColor: 'rgba(255, 255, 255, 0.88)',
				...style,
			}}
		>
			<div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
				{brand}

				<nav className='hidden items-center gap-6 md:flex'>
					{navItems.map((item) => {
						const Icon = item.icon;
						return (
							<a
								key={item.label}
								href={item.href}
								className='nav-link-underline flex items-center gap-2 text-xs font-semibold'
							>
								{Icon && <Icon size={15} className="text-(--app-color-primary)" />}
								{item.label}
							</a>
						);
					})}
				</nav>

				<div className='flex items-center gap-3'>{userMenu}</div>
			</div>
		</header>
	);
};

export default Header;
