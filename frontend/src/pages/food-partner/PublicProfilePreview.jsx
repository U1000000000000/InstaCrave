import React from 'react';
import useProtectedRequest from '../../hooks/useProtectedRequest';
import { API_ENDPOINTS } from '../../constants';

// TODO: Implement preview logic for food partner public profile
const PublicProfilePreview = () => {
	// Example: fetch profile data if needed
	// const protectedRequest = useProtectedRequest();
	// useEffect(() => { ... }, []);
	return (
		<div style={{padding: 32, color: 'var(--color-text-secondary)'}}>
			Public Profile Preview coming soon.
		</div>
	);
};

export default PublicProfilePreview;
