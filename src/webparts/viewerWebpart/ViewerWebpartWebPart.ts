import { Version } from "@microsoft/sp-core-library";
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from "@microsoft/sp-property-pane";
//<new>
import {
  ISPHttpClientOptions,
  SPHttpClientResponse,
  SPHttpClient,
} from "@microsoft/sp-http";
import { SPComponentLoader } from "@microsoft/sp-loader";
const viewer: any = require("./ForgeViewer.js");
export interface IGetSpListItemsWebPartProps {
  description: string;
}
const CLIENT_ID = "";
const CLIENT_SECRET = "";
//</new>
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import { IReadonlyTheme } from "@microsoft/sp-component-base";

import styles from "./ViewerWebpartWebPart.module.scss";
import * as strings from "ViewerWebpartWebPartStrings";

export interface IViewerWebpartWebPartProps {
  description: string;
  //<new>
  accessToken: string;
  //</new>
}

export default class ViewerWebpartWebPart extends BaseClientSideWebPart<IViewerWebpartWebPartProps> {
  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = "";

  protected onInit(): Promise<void> {
    this._environmentMessage = this._getEnvironmentMessage();

    return super.onInit();
  }

  //<new>
  private _monitorPage(): void {
    let displayedUrn = '';
    setInterval(() => {
      try {
        let sources = this.context.dynamicDataProvider.getAvailableSources();
        let source = sources.filter(item => {
          return (item.metadata.alias === 'ListWebPart');
        })[0];

        source.getPropertyValueAsync("selectedItems").then(val => {
          try {
            if (val[0].Urn.substring(0, 2) !== 'dX' || val[0].Urn === displayedUrn) 
              return;

            displayedUrn = val[0].Urn;
            viewer.launchViewer(
              displayedUrn,
              null,
              this.properties.accessToken
            );
          } catch {}
        });
      } catch {}
    }, 1000);
  }

  private _getAccessToken(): void {
    SPComponentLoader.loadScript(
      "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"
    );

    const spOpts: ISPHttpClientOptions = {
      body: `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials&scope=viewables:read`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    this.context.httpClient
      .post(
        "https://developer.api.autodesk.com/authentication/v1/authenticate",
        SPHttpClient.configurations.v1,
        spOpts
      )
      .then(async (response: SPHttpClientResponse) => {
        response.json().then((responseJSON: JSON) => {
          let json: any = responseJSON;
          this.properties.accessToken = json.access_token;
        });
      });
  }
  //</new>

  public render(): void {
    this._getAccessToken();
    this.domElement.innerHTML = `
    <section class="${styles.viewerWebpart} ${
      !!this.context.sdks.microsoftTeams ? styles.teams : ""
    }">
      <link rel="stylesheet" href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css" type="text/css">
      <div id="forgeViewer" class="${styles.forgeViewer}"></div>
    </section>`;
    this._monitorPage();
  }

  private _getEnvironmentMessage(): string {
    if (!!this.context.sdks.microsoftTeams) {
      // running in Teams
      return this.context.isServedFromLocalhost
        ? strings.AppLocalEnvironmentTeams
        : strings.AppTeamsTabEnvironment;
    }

    return this.context.isServedFromLocalhost
      ? strings.AppLocalEnvironmentSharePoint
      : strings.AppSharePointEnvironment;
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const { semanticColors } = currentTheme;
    this.domElement.style.setProperty("--bodyText", semanticColors.bodyText);
    this.domElement.style.setProperty("--link", semanticColors.link);
    this.domElement.style.setProperty(
      "--linkHovered",
      semanticColors.linkHovered
    );
  }

  protected get dataVersion(): Version {
    return Version.parse("1.0");
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription,
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField("description", {
                  label: strings.DescriptionFieldLabel,
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
