import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {NavController} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {catchError} from 'rxjs/operators';
import {of} from 'rxjs';
import {SharedElement} from '@app/social/share/shared-page.model';

@Component({
  selector: 'app-shared-page',
  templateUrl: './shared-page.component.html',
  styleUrls: ['./shared-page.component.scss'],
})
export class SharedPage implements OnInit {
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private http: HttpClient
  ) { }

  ngOnInit() {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    console.debug(`[shared-page] Downloading {${uuid}}...`)
    this.http.get<any>(`http://mon-application.domaine.com/download/${uuid}.json`)
      .pipe(
        catchError(err => {
          this.loading = false;
          this.error = true;
          return of();
        })
      )
      .subscribe((res: SharedElement) => {
        const path = res.path;
        const pathParams = res.pathParams;
        const queryParams = res.queryParams;
        this.navCtrl.navigateRoot(path, { queryParams, state: pathParams });
      });
  }
}
