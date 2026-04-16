import { InjectionToken } from "@angular/core";

export default function <SVC>(
	svcDescriptor : string, svcReference? : InjectionToken<SVC>
) {
	if( !svcReference ) { return }
	const tokenPattern = getRefNamePattern( svcDescriptor );
	if( !isValidTokenNameFor( new RegExp( `^${ tokenPattern }$` ), svcReference ) ) {
		throw new Error( `${ splitDescriptor( svcDescriptor ) } token name ${ svcReference!.toString() } supplied. A token of the format \`${ tokenPattern }\` expected.` );
	}
}

function getRefNamePattern( descriptor : string ) {
	return `${ descriptor }(_[A-Z0-9][a-zA-Z0-9]*)+`;
}

function isValidTokenNameFor<SVC>(
	pattern : RegExp, myToken : InjectionToken<SVC>
) {
	return pattern.test( myToken.toString().split( /\s+/ )[ 1 ] );
}

function splitDescriptor( descriptor : string ) {
	return descriptor.replace( /_/g, ' ' );
}
