import { Link } from 'react-router-dom';
import { Mail, Terminal, Globe, Users, ExternalLink, ShieldCheck } from 'lucide-react';
import Container from './Container';

export default function Footer() {
	return (
		<footer className='border-t border-(--app-color-border) bg-white pt-16 pb-10'>
			<Container>
				<div className='grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] pb-12'>
					<div className='space-y-4'>
						<Link to='/' className='flex items-center gap-2.5 logo-brand group'>
							<img src='/logo.svg' alt='DealFlow360' className='h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-105' />
							<div className="flex items-baseline font-bold tracking-tight text-lg">
								<span className="text-(--app-color-primary)">DealFlow</span>
								<span className="text-(--app-color-accent) font-extrabold ml-0.5">360</span>
							</div>
						</Link>
						<p className='max-w-xs text-xs leading-6 text-(--app-color-text-muted)'>
							Intelligent, self-governing B2B sales operations platform connecting quotations, multi-level approvals, multi-warehouse fulfillment, and hybrid billing.
						</p>
						<div className='flex items-center gap-3 pt-2'>
							<a href='#' className='p-1.5 rounded-lg border border-(--app-color-border) text-(--app-color-text-muted) hover:text-(--app-color-primary) hover:border-(--app-color-primary) transition-all'>
								<Globe size={15} />
							</a>
							<a href='#' className='p-1.5 rounded-lg border border-(--app-color-border) text-(--app-color-text-muted) hover:text-(--app-color-primary) hover:border-(--app-color-primary) transition-all'>
								<ShieldCheck size={15} />
							</a>
							<a href='#' className='p-1.5 rounded-lg border border-(--app-color-border) text-(--app-color-text-muted) hover:text-(--app-color-primary) hover:border-(--app-color-primary) transition-all'>
								<Terminal size={15} />
							</a>
						</div>
					</div>

					<div>
						<h4 className='text-xs font-bold uppercase tracking-wider text-(--app-color-text) mb-4'>Deal Flow Engine</h4>
						<ul className='space-y-2.5 text-xs text-(--app-color-text-muted)'>
							<li><a href='#quotations' className='hover:text-(--app-color-primary) transition-colors'>Smart Quotations</a></li>
							<li><a href='#approvals' className='hover:text-(--app-color-primary) transition-colors'>Discount Governance</a></li>
							<li><a href='#fulfillment' className='hover:text-(--app-color-primary) transition-colors'>Warehouse Allocation</a></li>
							<li><a href='#billing' className='hover:text-(--app-color-primary) transition-colors'>Hybrid Billing & Invoicing</a></li>
						</ul>
					</div>

					<div>
						<h4 className='text-xs font-bold uppercase tracking-wider text-(--app-color-text) mb-4'>Resources & Ops</h4>
						<ul className='space-y-2.5 text-xs text-(--app-color-text-muted)'>
							<li className='flex items-center gap-2'>
								<Mail size={13} className='text-(--app-color-accent)' />
								<a href='mailto:ops@dealflow360.io' className='hover:text-(--app-color-primary) transition-colors'>ops@dealflow360.io</a>
							</li>
							<li className='flex items-center gap-2'>
								<ExternalLink size={13} />
								<a href='#' className='hover:text-(--app-color-primary) transition-colors'>API Documentation</a>
							</li>
							<li className='flex items-center gap-2'>
								<ExternalLink size={13} />
								<a href='#' className='hover:text-(--app-color-primary) transition-colors'>Audit & Compliance</a>
							</li>
						</ul>
					</div>

					<div>
						<h4 className='text-xs font-bold uppercase tracking-wider text-(--app-color-text) mb-4'>Platform</h4>
						<ul className='space-y-2.5 text-xs text-(--app-color-text-muted)'>
							<li><a href='#' className='hover:text-(--app-color-primary) transition-colors'>Role-Based Access</a></li>
							<li><a href='#' className='hover:text-(--app-color-primary) transition-colors'>Terms of Service</a></li>
							<li><a href='#' className='hover:text-(--app-color-primary) transition-colors'>Privacy Policy</a></li>
							<li className='pt-1'>
								<span className='inline-flex items-center rounded-md bg-(--app-color-primary-soft) px-2 py-0.5 text-[10px] font-bold text-(--app-color-primary) uppercase tracking-wider'>
									Odoo Enterprise Theme
								</span>
							</li>
						</ul>
					</div>
				</div>

				<div className='pt-6 border-t border-(--app-color-border) flex flex-col md:flex-row items-center justify-between gap-4'>
					<p className='text-[11px] text-(--app-color-text-muted) font-medium'>
						© {new Date().getFullYear()} DealFlow360. All rights reserved.
					</p>
					<div className='flex items-center gap-5 text-[11px] font-semibold text-(--app-color-text-muted)'>
						<span>B2B Sales Operations Platform</span>
					</div>
				</div>
			</Container>
		</footer>
	);
}
