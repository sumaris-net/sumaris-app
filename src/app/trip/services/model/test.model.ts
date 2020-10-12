import {
  EntityUtils,
  fromDateISOString,
  isNotNil,
  Person,
  ReferentialRef,
  toDateISOString
} from "../../../core/core.module";
import {DataEntity, DataEntityAsObjectOptions} from "../../../data/services/model/data-entity.model";
import {NOT_MINIFY_OPTIONS} from "../../../core/services/model/referential.model";
import {Moment} from "moment";
import {isEmptyArray} from "../../../shared/functions";
import {TaxonNameRef} from "../../../referential/services/model/taxon.model";


export class Test extends DataEntity<Test>  {

  //TODO : créer TestVO requête
  static TYPENAME = 'TestVO';

  static fromObject(source: any): Test {
    const res = new Test();
    res.fromObject(source);

    return res;
  }

  startDate : Moment;
  endDate : Moment;
  comment : string;
  taxonName: TaxonNameRef;

  constructor() {
    super();
    this.__typename = Test.TYPENAME;
    this.comment=null;
    this.taxonName = null;
  }

  clone(): Test {
    return Test.fromObject(this.asObject());
  }

  asObject(options?: DataEntityAsObjectOptions): any {
    const target = super.asObject(options);

    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    target.comment = this.comment;
    target.taxonName = this.taxonName;

    return target;
  }

  fromObject(source: any): Test {
    super.fromObject(source);
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.comment = source.comment;
    this.taxonName = source.taxonName && TaxonNameRef.fromObject(source.taxonName) || undefined;
    return this;
  }

  }
