const util = require( 'util' );
const fs = require( 'fs' );

async function versioning() {
	const writeFile = util.promisify( fs.writeFile );
	const mainPkg = require( './package.json' );
	mainPkg.version = require( './projects/npm-pkg/package.json' ).version;
	return await writeFile( 'package.json', JSON.stringify( mainPkg, null, 4 ), 'utf-8' );
}

async function runPostbuild() {
	const path = require( 'path' );
	const copyFile = util.promisify( fs.copyFile );
	const tasks = [ 'LICENSE', 'logo.png', 'README.md' ].map(
		f => copyFile( f, path.join( 'dist', 'npm-pkg', f ) )
	);
	const res = await Promise.allSettled([ versioning(), ...tasks ]);
	let failed = false;
	for( let iLen = res.length, i = 0; i < iLen; i++ ) {
		const r = res[ i ];
		if( r.status === 'fulfilled' ) { continue }
		failed = true;
		console.log( `POST BUILD TASK #${ i } FAILURE >>>> `, r.reason );
	}
	if( failed ) { throw new Error( 'Postbuild failed.' ) }
	console.log( 'Postbuild completed.')
}

runPostbuild();
  