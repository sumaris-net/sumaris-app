import { ContextService } from '@app/shared/context.service';
import { DataContext } from '@app/data/services/model/data-context.model';


export class DataContextService<S extends DataContext = DataContext> extends ContextService<S> {

}
