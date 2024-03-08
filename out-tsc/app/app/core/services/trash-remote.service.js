import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { BaseGraphqlService, chainPromises, GraphqlService } from '@sumaris-net/ngx-components';
import { AppCoreErrorCodes } from '@app/core/services/errors';
import { environment } from '@environments/environment';
// Load a trash file
const LoadQuery = gql `
  query TrashEntity($entityName:String, $id: String){
    trashEntity(entityName: $entityName, id: $id)
  }
`;
// Delete a trash file
const DeleteMutation = gql `
  mutation DeleteTrashEntity($entityName:String, $id: String){
    deleteTrashEntity(entityName: $entityName, id: $id)
  }
`;
let TrashRemoteService = class TrashRemoteService extends BaseGraphqlService {
    constructor(graphql) {
        super(graphql, environment);
        this.graphql = graphql;
        if (this._debug)
            console.debug('[trash-service] Creating service');
    }
    load(entityName, id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug(`[trash-service] Load ${entityName}#${id} from the remote trash...`);
            // Execute mutation
            const res = yield this.graphql.query({
                query: LoadQuery,
                variables: {
                    entityName,
                    id
                },
                error: {
                    code: AppCoreErrorCodes.LOAD_TRASH_ENTITY_ERROR,
                    message: 'ERROR.LOAD_TRASH_ENTITY_ERROR'
                }
            });
            return res && res.trashEntity && JSON.parse(res.trashEntity);
        });
    }
    delete(entityName, id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug(`[trash-service] Deleting ${entityName}#${id} from the remote trash...`);
            // Execute mutation
            yield this.graphql.mutate({
                mutation: DeleteMutation,
                variables: {
                    entityName,
                    id
                },
                error: {
                    code: AppCoreErrorCodes.DELETE_TRASH_ENTITY_ERROR,
                    message: 'ERROR.DELETE_TRASH_ENTITY_ERROR'
                }
            });
        });
    }
    deleteAll(entityName, ids) {
        return __awaiter(this, void 0, void 0, function* () {
            // Delete one by one
            return chainPromises((ids || [])
                .map(id => (() => this.delete(entityName, id))));
        });
    }
};
TrashRemoteService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService])
], TrashRemoteService);
export { TrashRemoteService };
//# sourceMappingURL=trash-remote.service.js.map