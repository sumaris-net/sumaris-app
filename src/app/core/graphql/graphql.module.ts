import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AccountService } from '../services/account.service';

// Apollo
import { Apollo, ApolloModule } from 'apollo-angular';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { InMemoryCache, defaultDataIdFromObject } from 'apollo-cache-inmemory';
import { ApolloLink } from 'apollo-link';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';
import { onError } from 'apollo-link-error';

/* Hack on Websocket, to avoid the use of protocol */
declare let window: any;
const _global = typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {});
const NativeWebSocket = _global.WebSocket || _global.MozWebSocket;
const AppWebSocket = function (url: string, protocols?: string | string[]) {
  return new NativeWebSocket(url/*no protocols*/);
} as any;
AppWebSocket.CLOSED = NativeWebSocket.CLOSED;
AppWebSocket.CLOSING = NativeWebSocket.CLOSING;
AppWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
AppWebSocket.OPEN = NativeWebSocket.OPEN;

export const dataIdFromObject = function (object: Object): string {
  switch (object['__typename']) {
    // For generic type 'ReferentialVO', add entityName in the cache key (to distinguish by entity)
    case 'ReferentialVO': return object['entityName'] + ':' + object['id'];
    case 'MeasurementVO': return object['entityName'] + ':' + object['id'];
    // Fallback to default cache key
    default: return defaultDataIdFromObject(object);
  }
};

WebSocket
@NgModule({
  imports: [
    HttpClientModule,
    ApolloModule,
    HttpLinkModule
  ],
  exports: [
    HttpClientModule,
    ApolloModule,
    HttpLinkModule
  ]
})
export class AppGraphQLModule {
  constructor(
    private apollo: Apollo,
    private httpLink: HttpLink,
    private accountService: AccountService) {

    const uri = environment.remoteBaseUrl + '/graphql';
    const wsUri = String.prototype.replace.call(uri, "http", "ws") + '/websocket';
    console.info("[apollo] Starting GraphQL client...");
    console.info("[apollo] GraphQL base uri: " + uri);
    console.info("[apollo] GraphQL subscription uri: " + wsUri);

    // auth
    const http = httpLink.create({
      uri: uri,
    });

    const wsConnectionParams: { authToken?: string } = {};
    const ws = new WebSocketLink({
      uri: wsUri,
      options: {
        lazy: true,
        reconnect: true,
        connectionParams: wsConnectionParams,
        addTypename: true
      },
      webSocketImpl: AppWebSocket
    });

    const authLink = new ApolloLink((operation, forward) => {

      // Use the setContext method to set the HTTP headers.
      operation.setContext({
        headers: {
          authorization: wsConnectionParams.authToken ? `token ${wsConnectionParams.authToken}` : ''
        }
      });

      // Call the next link in the middleware chain.
      return forward(operation);
    });

    const imCache = new InMemoryCache({
      dataIdFromObject: dataIdFromObject
    });

    const link = onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors)
        graphQLErrors.map(({ message, locations, path }) =>
          console.log(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
          ),
        );

      if (networkError) console.log(`[Network error]: ${networkError}`);
    });

    // create Apollo
    apollo.create({
      link: ApolloLink.split(
        ({ query }) => {
          const def = getMainDefinition(query);
          return def.kind === 'OperationDefinition' && def.operation === 'subscription';
        },
        ws,
        authLink.concat(http)
      ),
      cache: imCache,
      connectToDevTools: !environment.production,
      defaultOptions: {
        watchQuery: {
          // See https://www.apollographql.com/docs/angular/features/error-handling.html
          errorPolicy: 'all'
        }
      }
    });

    // Update auth Token
    accountService.onAuthTokenChange.subscribe((token) => {
      if (token) {
        console.debug("[apollo] Setting new authentication token");
        wsConnectionParams.authToken = token;
      }
      else {
        console.debug("[apollo] Resetting authentication token");
        delete wsConnectionParams.authToken;
      }
    });
  }
}

