const API_CLIENT_ID = '96843715674-8orosbd2p51shogmit03uknq0g51sat1.apps.googleusercontent.com';
let ACCESS_TOKEN = '';

type stringMap = { [ key: string ]: string }
type anyMap = { [ key: string ]: any }

type YouTubeAPIThumbnail = {
	url: string
	height: number
	width: number
}

type YouTubeAPIVideo = {
	id: string
	snippet: {
		title: string
		thumbnails: {
			default: YouTubeAPIThumbnail
			medium?: YouTubeAPIThumbnail
			high?: YouTubeAPIThumbnail
		}
	}
}

type YouTubeAPIVideoList = {
	items: Array<YouTubeAPIVideo>
	nextPageToken?: string
	pageInfo: {
		totalResults: number
		resultsPerPage: number
	}
}

function makeURL( base: string, path: string = '', params: stringMap = {} ): string {
	if ( Object.keys( params ).length ) {
		const encodedParams = Object.keys( params ).reduce(( paramObj, paramName ) => {
			paramObj.append( paramName, params[ paramName ] );
			return paramObj;
		}, new URLSearchParams() ).toString();
		path += '?' + encodedParams;
	}
	return new URL( path, base ).href;
}

function APIRequest( apiBase: string, endpoint: string = '', params: stringMap = {} ): Promise<anyMap> {
	return fetch( makeURL( apiBase, endpoint, params ) ).then( data => data.json() );
}

function YouTubeAPIRequest( endpoint: string, params: stringMap = {} ): Promise<anyMap> {
	return APIRequest( 'https://www.googleapis.com/youtube/v3/', endpoint, params );
}

function getToken() {
	location.href = makeURL( 'https://accounts.google.com/o/oauth2/v2/', 'auth', {
		client_id: API_CLIENT_ID,
		redirect_uri: location.href.replace( /#.*/, '' ),
		response_type: 'token',
		scope: 'https://www.googleapis.com/auth/youtube.readonly',
	} );
}

function checkToken(): Promise<null> {
	if ( !ACCESS_TOKEN ) return Promise.reject( null );

	return APIRequest( 'https://www.googleapis.com/oauth2/v3/', 'tokeninfo', {
		access_token: ACCESS_TOKEN,
	} ).then( result => {
		if ( result.error ) return Promise.reject( null );
		if ( result.aud !== API_CLIENT_ID ) return Promise.reject( null );
		return Promise.resolve( null );
	} ).catch(() => {
		ACCESS_TOKEN = '';
		location.hash = '';
		return Promise.reject( null );
	} );
}

function saveToken() {
	if ( location.hash === '' ) return;
	const params = new URLSearchParams( location.hash.substr( 1 ) );
	const access_token = params.get( 'access_token' );
	if ( access_token ) ACCESS_TOKEN = access_token;
}

function getVideos( pageToken: string = '' ) {
	if ( !ACCESS_TOKEN ) return;

	return checkToken().then(() => {
		let params: stringMap = {
			part: 'id,snippet',
			myRating: 'dislike',
			maxResults: '50',
			access_token: ACCESS_TOKEN,
		};
		if ( pageToken ) params[ 'pageToken' ] = pageToken;
		return YouTubeAPIRequest( 'videos', params ) as Promise<YouTubeAPIVideoList>;
	} ).then( renderVideos );
}

function renderVideos( videos: YouTubeAPIVideoList ) {

	let html = `<p><strong>You haven't disliked anything</strong></p>`;

	if ( videos.items.length > 0 ) {
		html = videos.items.reduce(( _html, video ) => {
			_html += `<a href="https://youtu.be/${video.id}" target="_blank">
				<img src="${video.snippet.thumbnails.default.url}" />
				${video.snippet.title}
			</a>`;
			return _html;
		}, '' );
	}

	let auth = document.querySelector( '#auth' );
	if ( auth ) {
		auth.setAttribute( 'hidden', '' );
	}

	let videoList = document.querySelector( '#videos' );
	if ( !videoList ) return;
	videoList.innerHTML += html;
	videoList.removeAttribute( 'hidden' );
	
	let nextPageButton = videoList.querySelector( 'button' );
	if ( nextPageButton ) nextPageButton.remove();

	if ( videos.nextPageToken ) {
		videoList.innerHTML += `<p><button>Next Page</button></p>`;
		nextPageButton = videoList.querySelector( 'button' );
		if ( nextPageButton ) {
			nextPageButton.addEventListener( 'click', function() {
				this.setAttribute( 'hidden', '' );
				getVideos( videos.nextPageToken );
			} );
		}
	}
}

document.addEventListener( 'DOMContentLoaded', () => {

	saveToken();
	if ( ACCESS_TOKEN ) {
		getVideos();
	}

	const authButton = document.querySelector( '#auth button' );
	if ( authButton ) {
		authButton.addEventListener( 'click', getToken );
	}

} );
