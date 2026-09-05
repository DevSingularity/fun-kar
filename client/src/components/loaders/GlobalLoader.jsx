import React from 'react';
import Loader from './loadnet';

const GlobalLoader = ({ showTagline = false, isExiting = false }) => {
	return (
		<div
			className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden ${
				isExiting ? 'animate-loader-exit' : ''
			}`}
			style={{ background: 'var(--app-gradient-auth-login)' }}
		>
			{/* Animated Background Elements */}
			<div className='absolute inset-0 opacity-20'>
				<div className='absolute -left-1/4 -top-1/4 h-1/2 w-1/2 animate-pulse rounded-full bg-(--app-color-primary)/30 blur-[120px]' />
				<div className='absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 animate-pulse rounded-full bg-(--app-color-accent)/30 blur-[120px]' />
			</div>

			<div className='relative flex flex-col items-center gap-10'>
				<div className='scale-125'>
					<Loader size={1.5} color='var(--app-color-primary)' />
				</div>

				{showTagline && (
					<div className='animate-tagline-reveal space-y-2 text-center'>
						<h1 className='text-2xl font-bold tracking-tight text-white lg:text-3xl'>
							DealFlow<span className='text-teal-300'>360</span>
						</h1>
						<p className='text-xs font-medium text-white/75 tracking-wider uppercase'>
							Intelligent Sales Operations & Deal Governance
						</p>
						<div className='mx-auto h-[2px] w-12 rounded-full bg-teal-400/50' />
					</div>
				)}
			</div>

			{/* Loading Progress Indicator */}
			{!showTagline && (
				<div className='absolute bottom-12 flex flex-col items-center gap-3'>
					<div className='h-1 w-32 overflow-hidden rounded-full bg-white/15'>
						<div className='h-full w-1/2 animate-[progress_2s_ease-in-out_infinite] bg-(--app-color-accent) shadow-[0_0_10px_rgba(0,135,132,0.5)]' />
					</div>
					<p className='text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50'>Initializing DealFlow360</p>
				</div>
			)}
		</div>
	);
};

export default GlobalLoader;
