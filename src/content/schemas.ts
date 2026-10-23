import { z } from 'zod';
export const schemas = {
  pages: {
    home: z.object({
      "hero": z.object({
        "badge": z.string(),
        "headline1": z.string(),
        "headline2": z.string(),
        "headlineAccent": z.string(),
        "headline3": z.string(),
        "subhead": z.string(),
        "ctaPrimary": z.string(),
        "ctaSecondary": z.string(),
        "stats": z.array(z.object({
          "id": z.string(),
          "value": z.string(),
          "label": z.string()
        }))
      }),
      "howItWorks": z.object({
        "eyebrow": z.string(),
        "headline": z.string(),
        "subhead": z.string(),
        "steps": z.array(z.object({
          "id": z.string(),
          "step": z.string(),
          "title": z.string(),
          "subtitle": z.string(),
          "description": z.string()
        }))
      }),
      "features": z.object({
        "eyebrow": z.string(),
        "headline": z.string(),
        "rows": z.array(z.object({
          "id": z.string(),
          "stat": z.string(),
          "title": z.string(),
          "description": z.string()
        }))
      }),
      "providers": z.object({
        "eyebrow": z.string(),
        "headline1": z.string(),
        "headlineAccent": z.string(),
        "subhead": z.string(),
        "benefits": z.array(z.object({
          "id": z.string(),
          "text": z.string()
        })),
        "cta": z.string()
      }),
      "ctaSection": z.object({
        "patients": z.object({
          "eyebrow": z.string(),
          "headline1": z.string(),
          "headline2": z.string(),
          "body": z.string(),
          "cta": z.string()
        }),
        "clinicians": z.object({
          "eyebrow": z.string(),
          "headline1": z.string(),
          "headline2": z.string(),
          "body": z.string(),
          "cta": z.string()
        })
      })
    }),
    portal: z.object({
      "portalLabel": z.string(),
      "welcomeHeading": z.string(),
      "welcomeSubheading": z.string(),
      "startIntakeHeading": z.string(),
      "startIntakeSubheading": z.string(),
      "startIntakeButton": z.string(),
      "recentIntakesHeading": z.string(),
      "noIntakesText": z.string(),
      "historyHeading": z.string(),
      "profileHeading": z.string(),
      "accountLabel": z.string(),
      "signOutButton": z.string(),
      "overviewTab": z.string(),
      "historyTab": z.string(),
      "profileTab": z.string()
    }),
    signup: z.object({
      "brandName": z.string(),
      "heading": z.string(),
      "subheading": z.string(),
      "nameLabel": z.string(),
      "emailLabel": z.string(),
      "passwordLabel": z.string(),
      "submitButton": z.string(),
      "hasAccountText": z.string(),
      "hasAccountLink": z.string()
    }),
    login: z.object({
      "brandName": z.string(),
      "heading": z.string(),
      "subheading": z.string(),
      "emailLabel": z.string(),
      "passwordLabel": z.string(),
      "submitButton": z.string(),
      "noAccountText": z.string(),
      "noAccountLink": z.string()
    }),
    auth: z.object({
      "signInHeading": z.string(),
      "createAccountHeading": z.string(),
      "welcomeHeading": z.string(),
      "signInToContinue": z.string(),
      "orDivider": z.string(),
      "termsNotice": z.string(),
      "passwordHint": z.string()
    }),
    provider: z.object({
      "portalLabel": z.string(),
      "welcomeHeading": z.string(),
      "welcomeSubheading": z.string(),
      "statsCompletedLabel": z.string(),
      "statsPatientsLabel": z.string(),
      "statsFlagsLabel": z.string(),
      "statsAvgTimeLabel": z.string(),
      "statsAvgTimeValue": z.string(),
      "emptyQueueHeading": z.string(),
      "emptyQueueSubheading": z.string(),
      "patientBriefHeading": z.string(),
      "flagsLabel": z.string(),
      "complaintsLabel": z.string(),
      "summaryLabel": z.string(),
      "conditionsLabel": z.string(),
      "medicationsLabel": z.string(),
      "allergiesLabel": z.string(),
      "intakeDateLabel": z.string(),
      "noSummaryText": z.string(),
      "signOutButton": z.string(),
      "allTab": z.string(),
      "flaggedTab": z.string(),
      "searchPlaceholder": z.string()
    }),
    intake: z.object({
      "pageTitle": z.string(),
      "pageDescription": z.string(),
      "startHeading": z.string(),
      "startSubheading": z.string(),
      "startButton": z.string(),
      "hipaaNote": z.string(),
      "progressLabel": z.string(),
      "progressOf": z.string(),
      "backButton": z.string(),
      "nextButton": z.string(),
      "submitButton": z.string(),
      "otherOption": z.string(),
      "otherPlaceholder": z.string(),
      "completeHeading": z.string(),
      "completeSubheading": z.string(),
      "completePortalButton": z.string(),
      "completeNewButton": z.string(),
      "savingLabel": z.string(),
      "errorLabel": z.string(),
      "statQuestionsLabel": z.string(),
      "statQuestionsValue": z.string(),
      "statMinutesLabel": z.string(),
      "statMinutesValue": z.string(),
      "statHipaaLabel": z.string(),
      "statHipaaValue": z.string(),
      "stepChiefComplaintTitle": z.string(),
      "stepChiefComplaintSubtitle": z.string(),
      "stepChiefComplaintDescriptionLabel": z.string(),
      "stepChiefComplaintDescriptionPlaceholder": z.string(),
      "stepSeverityTitle": z.string(),
      "stepSeveritySubtitle": z.string(),
      "stepDurationTitle": z.string(),
      "stepDurationSubtitle": z.string(),
      "stepAssociatedTitle": z.string(),
      "stepAssociatedSubtitle": z.string(),
      "stepMedicationsTitle": z.string(),
      "stepMedicationsSubtitle": z.string(),
      "stepAllergiesTitle": z.string(),
      "stepAllergiesSubtitle": z.string(),
      "stepHistoryTitle": z.string(),
      "stepHistorySubtitle": z.string(),
      "stepNotesTitle": z.string(),
      "stepNotesSubtitle": z.string(),
      "stepNotesPlaceholder": z.string()
    }),
    about: z.object({
      "hero": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "subheading": z.string()
      }),
      "mission": z.object({
        "heading": z.string(),
        "body": z.array(z.object({
          "id": z.string(),
          "text": z.string()
        })),
        "stat1Value": z.string(),
        "stat1Label": z.string(),
        "stat2Value": z.string(),
        "stat2Label": z.string(),
        "stat3Value": z.string(),
        "stat3Label": z.string()
      }),
      "howItWorks": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "steps": z.array(z.object({
          "id": z.string(),
          "number": z.string(),
          "title": z.string(),
          "body": z.string()
        }))
      }),
      "ai": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "body": z.array(z.object({
          "id": z.string(),
          "text": z.string()
        })),
        "capabilities": z.array(z.object({
          "id": z.string(),
          "label": z.string(),
          "detail": z.string()
        }))
      }),
      "hipaa": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "body": z.string(),
        "badges": z.array(z.object({
          "id": z.string(),
          "label": z.string(),
          "detail": z.string()
        }))
      }),
      "team": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "subheading": z.string(),
        "members": z.array(z.object({
          "id": z.string(),
          "name": z.string(),
          "role": z.string(),
          "bio": z.string()
        }))
      }),
      "cta": z.object({
        "heading": z.string(),
        "subheading": z.string(),
        "primaryButton": z.string(),
        "secondaryButton": z.string()
      })
    }),
    providers: z.object({
      "hero": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "subheading": z.string(),
        "primaryButton": z.string(),
        "secondaryButton": z.string()
      }),
      "stats": z.array(z.object({
        "id": z.string(),
        "value": z.string(),
        "label": z.string()
      })),
      "benefits": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "items": z.array(z.object({
          "id": z.string(),
          "title": z.string(),
          "body": z.string()
        }))
      }),
      "howItWorks": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "steps": z.array(z.object({
          "id": z.string(),
          "number": z.string(),
          "title": z.string(),
          "body": z.string()
        }))
      }),
      "earnings": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "body": z.string(),
        "details": z.array(z.object({
          "id": z.string(),
          "label": z.string(),
          "detail": z.string()
        }))
      }),
      "testimonials": z.array(z.object({
        "id": z.string(),
        "quote": z.string(),
        "name": z.string(),
        "credential": z.string()
      })),
      "requirements": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "items": z.array(z.object({
          "id": z.string(),
          "text": z.string()
        }))
      }),
      "cta": z.object({
        "heading": z.string(),
        "subheading": z.string(),
        "primaryButton": z.string(),
        "secondaryButton": z.string()
      })
    }),
    patients: z.object({
      "hero": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "subheading": z.string(),
        "primaryButton": z.string(),
        "secondaryButton": z.string()
      }),
      "stats": z.array(z.object({
        "id": z.string(),
        "value": z.string(),
        "label": z.string()
      })),
      "conditions": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "subheading": z.string(),
        "categories": z.array(z.object({
          "id": z.string(),
          "label": z.string(),
          "items": z.array(z.object({
            "id": z.string(),
            "name": z.string()
          }))
        }))
      }),
      "benefits": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "items": z.array(z.object({
          "id": z.string(),
          "title": z.string(),
          "body": z.string()
        }))
      }),
      "howItWorks": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "steps": z.array(z.object({
          "id": z.string(),
          "number": z.string(),
          "title": z.string(),
          "body": z.string()
        }))
      }),
      "cost": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "body": z.string(),
        "details": z.array(z.object({
          "id": z.string(),
          "label": z.string(),
          "detail": z.string()
        }))
      }),
      "testimonials": z.array(z.object({
        "id": z.string(),
        "quote": z.string(),
        "name": z.string(),
        "location": z.string()
      })),
      "privacy": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "body": z.string(),
        "badges": z.array(z.object({
          "id": z.string(),
          "label": z.string(),
          "detail": z.string()
        }))
      }),
      "faq": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "items": z.array(z.object({
          "id": z.string(),
          "question": z.string(),
          "answer": z.string()
        }))
      }),
      "cta": z.object({
        "heading": z.string(),
        "subheading": z.string(),
        "primaryButton": z.string(),
        "secondaryButton": z.string()
      })
    }),
    admin_providers: z.object({
      "pageTitle": z.string(),
      "heading": z.string(),
      "subheading": z.string(),
      "statTotalLabel": z.string(),
      "statProvidersLabel": z.string(),
      "statPatientsLabel": z.string(),
      "searchPlaceholder": z.string(),
      "filterAll": z.string(),
      "filterProviders": z.string(),
      "filterPatients": z.string(),
      "colName": z.string(),
      "colEmail": z.string(),
      "colRole": z.string(),
      "colAction": z.string(),
      "actionMakeProvider": z.string(),
      "actionRemoveAccess": z.string(),
      "dialogPromoteTitle": z.string(),
      "dialogDemoteTitle": z.string(),
      "dialogPromoteBody": z.string(),
      "dialogDemoteBody": z.string(),
      "dialogCancel": z.string(),
      "dialogGrantAccess": z.string(),
      "dialogRemoveAccess": z.string(),
      "dialogSaving": z.string(),
      "toastPromoted": z.string(),
      "toastDemoted": z.string(),
      "toastRoleFailed": z.string(),
      "errorLoadUsers": z.string(),
      "retryButton": z.string(),
      "noUsersFound": z.string(),
      "footerAdminNote": z.string(),
      "navProviderDashboard": z.string(),
      "headerTitle": z.string(),
      "headerSubtitle": z.string(),
      "badgeAdmin": z.string(),
      "badgeProvider": z.string(),
      "badgePatient": z.string(),
      "labelYou": z.string(),
      "labelAdmin": z.string(),
      "labelSaving": z.string()
    }),
    how_it_works: z.object({
      "meta": z.object({
        "title": z.string(),
        "description": z.string()
      }),
      "hero": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "subheading": z.string()
      }),
      "patientSection": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "subheading": z.string(),
        "steps": z.array(z.object({
          "id": z.string(),
          "number": z.string(),
          "title": z.string(),
          "body": z.string()
        })),
        "cta": z.object({
          "label": z.string(),
          "href": z.string()
        })
      }),
      "providerSection": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "subheading": z.string(),
        "steps": z.array(z.object({
          "id": z.string(),
          "number": z.string(),
          "title": z.string(),
          "body": z.string()
        })),
        "cta": z.object({
          "label": z.string(),
          "href": z.string()
        })
      }),
      "featuresSection": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "features": z.array(z.object({
          "id": z.string(),
          "icon": z.string(),
          "title": z.string(),
          "body": z.string()
        }))
      }),
      "ctaSection": z.object({
        "heading": z.string(),
        "subheading": z.string(),
        "patientCta": z.object({
          "label": z.string(),
          "href": z.string()
        }),
        "providerCta": z.object({
          "label": z.string(),
          "href": z.string()
        })
      })
    })
  }
};
export type Schemas = typeof schemas;