export function isString<T>( v : T ) {
	return Object.prototype.toString.call( v ).endsWith( ' String]' );
}
