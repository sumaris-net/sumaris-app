import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {NavController} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {catchError} from 'rxjs/operators';
import {of} from 'rxjs';
import {SharedElement} from '@app/social/share/shared-page.model';
import {LocalSettingsService} from '@sumaris-net/ngx-components';
import {ContextService} from '@app/shared/context.service';

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
    private http: HttpClient,
    private settings: LocalSettingsService,
    private router: Router,
    private context: ContextService
  ) {
  }

  ngOnInit() {
    this.downloadData();
  }
  async downloadData() {
    await this.settings.ready();
    const peerUrl = this.settings.settings.peerUrl;
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const fileName = `${uuid}.json`;

    console.debug(`[shared-page] Downloading {${uuid}}...`)
    this.http.get<any>(
      `${peerUrl}/download/public/${fileName}`,
      {
       params: {
       },
      }
    ).pipe(
      catchError(err => {
        this.loading = false;
        this.error = true;
        return of();
      })
    ).subscribe((res: SharedElement) => {
      const path = res.path;
      const content = res.content;
      const queryParams = res.queryParams;

      // Redirect only if need to pass some queryParams
      const skipLocationChange = Object.keys(queryParams).length === 0;

      this.context.clipboard = content;
      this.navCtrl.navigateRoot(
        path,
        {
          skipLocationChange,
          queryParams,
        },
      );
    });
  }
}
