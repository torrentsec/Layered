// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

// MET Norway locationforecast/2.0/complete for central London, trimmed: hourly steps for two and a half days, then six-hourly.

import type { MetnoResponse } from './metno';

const RAW = {
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [
      -0.13,
      51.51,
      24
    ]
  },
  "properties": {
    "meta": {
      "updated_at": "2026-11-26T07:41:12Z",
      "units": {
        "air_temperature": "celsius",
        "cloud_area_fraction": "%",
        "precipitation_amount": "mm",
        "relative_humidity": "%",
        "wind_speed": "m/s"
      }
    },
    "timeseries": [
      {
        "time": "2026-11-26T08:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.0,
              "air_temperature": 5.2,
              "cloud_area_fraction": 60.0,
              "dew_point_temperature": 2.7,
              "relative_humidity": 84.1,
              "wind_from_direction": 240.0,
              "wind_speed": 4.2,
              "ultraviolet_index_clear_sky": 0.4
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 6.2,
              "air_temperature_min": 4.2,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T09:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.0,
              "air_temperature": 6.0,
              "cloud_area_fraction": 66.0,
              "dew_point_temperature": 3.5,
              "relative_humidity": 82.0,
              "wind_from_direction": 241.1,
              "wind_speed": 4.4,
              "ultraviolet_index_clear_sky": 0.8
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 7.0,
              "air_temperature_min": 5.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T10:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.1,
              "air_temperature": 6.7,
              "cloud_area_fraction": 71.7,
              "dew_point_temperature": 4.2,
              "relative_humidity": 79.9,
              "wind_from_direction": 242.2,
              "wind_speed": 4.6,
              "ultraviolet_index_clear_sky": 1.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 7.7,
              "air_temperature_min": 5.7,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T11:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.1,
              "air_temperature": 7.4,
              "cloud_area_fraction": 76.9,
              "dew_point_temperature": 4.9,
              "relative_humidity": 78.0,
              "wind_from_direction": 243.3,
              "wind_speed": 4.8,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 8.4,
              "air_temperature_min": 6.4,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T12:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.2,
              "air_temperature": 8.0,
              "cloud_area_fraction": 81.5,
              "dew_point_temperature": 5.5,
              "relative_humidity": 76.3,
              "wind_from_direction": 244.3,
              "wind_speed": 5.0,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 9.0,
              "air_temperature_min": 7.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T13:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.2,
              "air_temperature": 8.5,
              "cloud_area_fraction": 85.2,
              "dew_point_temperature": 6.0,
              "relative_humidity": 75.1,
              "wind_from_direction": 245.3,
              "wind_speed": 5.2,
              "ultraviolet_index_clear_sky": 1.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 9.5,
              "air_temperature_min": 7.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T14:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.3,
              "air_temperature": 8.8,
              "cloud_area_fraction": 88.0,
              "dew_point_temperature": 6.3,
              "relative_humidity": 74.3,
              "wind_from_direction": 246.2,
              "wind_speed": 5.3,
              "ultraviolet_index_clear_sky": 0.8
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 9.8,
              "air_temperature_min": 7.8,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T15:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.4,
              "air_temperature": 8.9,
              "cloud_area_fraction": 89.6,
              "dew_point_temperature": 6.4,
              "relative_humidity": 74.0,
              "wind_from_direction": 247.0,
              "wind_speed": 5.5,
              "ultraviolet_index_clear_sky": 0.4
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 9.9,
              "air_temperature_min": 7.9,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T16:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.4,
              "air_temperature": 8.7,
              "cloud_area_fraction": 90.0,
              "dew_point_temperature": 6.2,
              "relative_humidity": 74.3,
              "wind_from_direction": 247.8,
              "wind_speed": 5.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 9.7,
              "air_temperature_min": 7.7,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T17:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.5,
              "air_temperature": 8.4,
              "cloud_area_fraction": 89.2,
              "dew_point_temperature": 5.9,
              "relative_humidity": 75.1,
              "wind_from_direction": 248.4,
              "wind_speed": 5.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 9.4,
              "air_temperature_min": 7.4,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T18:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.5,
              "air_temperature": 7.9,
              "cloud_area_fraction": 87.3,
              "dew_point_temperature": 5.4,
              "relative_humidity": 76.3,
              "wind_from_direction": 249.0,
              "wind_speed": 5.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {
              "precipitation_amount": 0.6,
              "probability_of_precipitation": 70.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {
              "air_temperature_max": 8.9,
              "air_temperature_min": 6.9,
              "precipitation_amount": 2.4
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T19:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.5,
              "air_temperature": 7.3,
              "cloud_area_fraction": 84.3,
              "dew_point_temperature": 4.8,
              "relative_humidity": 78.0,
              "wind_from_direction": 249.4,
              "wind_speed": 5.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {
              "precipitation_amount": 0.6,
              "probability_of_precipitation": 70.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {
              "air_temperature_max": 8.3,
              "air_temperature_min": 6.3,
              "precipitation_amount": 2.4
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T20:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.6,
              "air_temperature": 6.5,
              "cloud_area_fraction": 80.3,
              "dew_point_temperature": 4.0,
              "relative_humidity": 79.9,
              "wind_from_direction": 249.7,
              "wind_speed": 5.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {
              "precipitation_amount": 0.6,
              "probability_of_precipitation": 70.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {
              "air_temperature_max": 7.5,
              "air_temperature_min": 5.5,
              "precipitation_amount": 2.4
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T21:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.6,
              "air_temperature": 5.7,
              "cloud_area_fraction": 75.5,
              "dew_point_temperature": 3.2,
              "relative_humidity": 82.0,
              "wind_from_direction": 249.9,
              "wind_speed": 5.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {
              "precipitation_amount": 0.6,
              "probability_of_precipitation": 70.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {
              "air_temperature_max": 6.7,
              "air_temperature_min": 4.7,
              "precipitation_amount": 2.4
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T22:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.7,
              "air_temperature": 4.9,
              "cloud_area_fraction": 70.0,
              "dew_point_temperature": 2.4,
              "relative_humidity": 84.1,
              "wind_from_direction": 250.0,
              "wind_speed": 5.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {
              "precipitation_amount": 0.6,
              "probability_of_precipitation": 70.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {
              "air_temperature_max": 5.9,
              "air_temperature_min": 3.9,
              "precipitation_amount": 2.4
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "lightrainshowers_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-26T23:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.8,
              "air_temperature": 4.2,
              "cloud_area_fraction": 64.2,
              "dew_point_temperature": 1.7,
              "relative_humidity": 86.0,
              "wind_from_direction": 250.0,
              "wind_speed": 5.5,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 5.2,
              "air_temperature_min": 3.2,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.8,
              "air_temperature": 3.6,
              "cloud_area_fraction": 58.2,
              "dew_point_temperature": 1.1,
              "relative_humidity": 87.7,
              "wind_from_direction": 249.8,
              "wind_speed": 5.3,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 4.6,
              "air_temperature_min": 2.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T01:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.9,
              "air_temperature": 3.1,
              "cloud_area_fraction": 52.3,
              "dew_point_temperature": 0.6,
              "relative_humidity": 88.9,
              "wind_from_direction": 249.5,
              "wind_speed": 5.2,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 4.1,
              "air_temperature_min": 2.1,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T02:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1004.9,
              "air_temperature": 2.7,
              "cloud_area_fraction": 46.7,
              "dew_point_temperature": 0.2,
              "relative_humidity": 89.7,
              "wind_from_direction": 249.1,
              "wind_speed": 5.0,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 3.7,
              "air_temperature_min": 1.7,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T03:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.0,
              "air_temperature": 2.6,
              "cloud_area_fraction": 41.6,
              "dew_point_temperature": 0.1,
              "relative_humidity": 90.0,
              "wind_from_direction": 248.6,
              "wind_speed": 4.8,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 3.6,
              "air_temperature_min": 1.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T04:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.0,
              "air_temperature": 2.7,
              "cloud_area_fraction": 37.3,
              "dew_point_temperature": 0.2,
              "relative_humidity": 89.7,
              "wind_from_direction": 248.0,
              "wind_speed": 4.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 3.7,
              "air_temperature_min": 1.7,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T05:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.0,
              "air_temperature": 3.0,
              "cloud_area_fraction": 33.9,
              "dew_point_temperature": 0.5,
              "relative_humidity": 88.9,
              "wind_from_direction": 247.2,
              "wind_speed": 4.4,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 4.0,
              "air_temperature_min": 2.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T06:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.1,
              "air_temperature": 3.4,
              "cloud_area_fraction": 31.5,
              "dew_point_temperature": 0.9,
              "relative_humidity": 87.7,
              "wind_from_direction": 246.4,
              "wind_speed": 4.2,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 4.4,
              "air_temperature_min": 2.4,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T07:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.1,
              "air_temperature": 4.0,
              "cloud_area_fraction": 30.2,
              "dew_point_temperature": 1.5,
              "relative_humidity": 86.0,
              "wind_from_direction": 245.5,
              "wind_speed": 4.0,
              "ultraviolet_index_clear_sky": 0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 5.0,
              "air_temperature_min": 3.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T08:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.2,
              "air_temperature": 4.7,
              "cloud_area_fraction": 30.1,
              "dew_point_temperature": 2.2,
              "relative_humidity": 84.1,
              "wind_from_direction": 244.6,
              "wind_speed": 3.8,
              "ultraviolet_index_clear_sky": 0.4
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 5.7,
              "air_temperature_min": 3.7,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T09:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.2,
              "air_temperature": 5.5,
              "cloud_area_fraction": 31.2,
              "dew_point_temperature": 3.0,
              "relative_humidity": 82.0,
              "wind_from_direction": 243.6,
              "wind_speed": 3.6,
              "ultraviolet_index_clear_sky": 0.8
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 6.5,
              "air_temperature_min": 4.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T10:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.3,
              "air_temperature": 6.3,
              "cloud_area_fraction": 33.5,
              "dew_point_temperature": 3.8,
              "relative_humidity": 79.9,
              "wind_from_direction": 242.5,
              "wind_speed": 3.4,
              "ultraviolet_index_clear_sky": 1.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 7.3,
              "air_temperature_min": 5.3,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T11:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.4,
              "air_temperature": 7.0,
              "cloud_area_fraction": 36.8,
              "dew_point_temperature": 4.5,
              "relative_humidity": 78.0,
              "wind_from_direction": 241.4,
              "wind_speed": 3.2,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 8.0,
              "air_temperature_min": 6.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T12:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.4,
              "air_temperature": 7.6,
              "cloud_area_fraction": 41.1,
              "dew_point_temperature": 5.1,
              "relative_humidity": 76.3,
              "wind_from_direction": 240.3,
              "wind_speed": 3.1,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 8.6,
              "air_temperature_min": 6.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T13:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.5,
              "air_temperature": 8.0,
              "cloud_area_fraction": 46.1,
              "dew_point_temperature": 5.5,
              "relative_humidity": 75.1,
              "wind_from_direction": 239.2,
              "wind_speed": 2.9,
              "ultraviolet_index_clear_sky": 1.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 9.0,
              "air_temperature_min": 7.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T14:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.5,
              "air_temperature": 8.3,
              "cloud_area_fraction": 51.6,
              "dew_point_temperature": 5.8,
              "relative_humidity": 74.3,
              "wind_from_direction": 238.1,
              "wind_speed": 2.8,
              "ultraviolet_index_clear_sky": 0.8
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 9.3,
              "air_temperature_min": 7.3,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T15:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.5,
              "air_temperature": 8.4,
              "cloud_area_fraction": 57.5,
              "dew_point_temperature": 5.9,
              "relative_humidity": 74.0,
              "wind_from_direction": 237.0,
              "wind_speed": 2.8,
              "ultraviolet_index_clear_sky": 0.4
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 9.4,
              "air_temperature_min": 7.4,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T16:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.6,
              "air_temperature": 8.3,
              "cloud_area_fraction": 63.5,
              "dew_point_temperature": 5.8,
              "relative_humidity": 74.3,
              "wind_from_direction": 236.0,
              "wind_speed": 2.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 9.3,
              "air_temperature_min": 7.3,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T17:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.6,
              "air_temperature": 7.9,
              "cloud_area_fraction": 69.3,
              "dew_point_temperature": 5.4,
              "relative_humidity": 75.1,
              "wind_from_direction": 235.0,
              "wind_speed": 2.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 8.9,
              "air_temperature_min": 6.9,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T18:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.7,
              "air_temperature": 7.4,
              "cloud_area_fraction": 74.8,
              "dew_point_temperature": 4.9,
              "relative_humidity": 76.3,
              "wind_from_direction": 234.1,
              "wind_speed": 2.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 8.4,
              "air_temperature_min": 6.4,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T19:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.8,
              "air_temperature": 6.8,
              "cloud_area_fraction": 79.7,
              "dew_point_temperature": 4.3,
              "relative_humidity": 78.0,
              "wind_from_direction": 233.2,
              "wind_speed": 2.8,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 7.8,
              "air_temperature_min": 5.8,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T20:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.8,
              "air_temperature": 6.1,
              "cloud_area_fraction": 83.8,
              "dew_point_temperature": 3.6,
              "relative_humidity": 79.9,
              "wind_from_direction": 232.4,
              "wind_speed": 2.8,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 7.1,
              "air_temperature_min": 5.1,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T21:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.9,
              "air_temperature": 5.3,
              "cloud_area_fraction": 87.0,
              "dew_point_temperature": 2.8,
              "relative_humidity": 82.0,
              "wind_from_direction": 231.8,
              "wind_speed": 2.9,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 6.3,
              "air_temperature_min": 4.3,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T22:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1005.9,
              "air_temperature": 4.5,
              "cloud_area_fraction": 89.0,
              "dew_point_temperature": 2.0,
              "relative_humidity": 84.1,
              "wind_from_direction": 231.2,
              "wind_speed": 3.1,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 5.5,
              "air_temperature_min": 3.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-27T23:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.0,
              "air_temperature": 3.7,
              "cloud_area_fraction": 90.0,
              "dew_point_temperature": 1.2,
              "relative_humidity": 86.0,
              "wind_from_direction": 230.7,
              "wind_speed": 3.2,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 4.7,
              "air_temperature_min": 2.7,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.0,
              "air_temperature": 3.1,
              "cloud_area_fraction": 89.7,
              "dew_point_temperature": 0.6,
              "relative_humidity": 87.7,
              "wind_from_direction": 230.4,
              "wind_speed": 3.4,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 4.1,
              "air_temperature_min": 2.1,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T01:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.0,
              "air_temperature": 2.6,
              "cloud_area_fraction": 88.2,
              "dew_point_temperature": 0.1,
              "relative_humidity": 88.9,
              "wind_from_direction": 230.1,
              "wind_speed": 3.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 3.6,
              "air_temperature_min": 1.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T02:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.1,
              "air_temperature": 2.3,
              "cloud_area_fraction": 85.6,
              "dew_point_temperature": -0.2,
              "relative_humidity": 89.7,
              "wind_from_direction": 230.0,
              "wind_speed": 3.8,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 3.3,
              "air_temperature_min": 1.3,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T03:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.1,
              "air_temperature": 2.1,
              "cloud_area_fraction": 82.0,
              "dew_point_temperature": -0.4,
              "relative_humidity": 90.0,
              "wind_from_direction": 230.0,
              "wind_speed": 4.0,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 3.1,
              "air_temperature_min": 1.1,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T04:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.2,
              "air_temperature": 2.2,
              "cloud_area_fraction": 77.5,
              "dew_point_temperature": -0.3,
              "relative_humidity": 89.7,
              "wind_from_direction": 230.2,
              "wind_speed": 4.2,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 3.2,
              "air_temperature_min": 1.2,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T05:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.2,
              "air_temperature": 2.5,
              "cloud_area_fraction": 72.4,
              "dew_point_temperature": 0.0,
              "relative_humidity": 88.9,
              "wind_from_direction": 230.4,
              "wind_speed": 4.4,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 3.5,
              "air_temperature_min": 1.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T06:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.3,
              "air_temperature": 3.0,
              "cloud_area_fraction": 66.7,
              "dew_point_temperature": 0.5,
              "relative_humidity": 87.7,
              "wind_from_direction": 230.8,
              "wind_speed": 4.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 4.0,
              "air_temperature_min": 2.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T07:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.4,
              "air_temperature": 3.6,
              "cloud_area_fraction": 60.7,
              "dew_point_temperature": 1.1,
              "relative_humidity": 86.0,
              "wind_from_direction": 231.3,
              "wind_speed": 4.8,
              "ultraviolet_index_clear_sky": 0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 4.6,
              "air_temperature_min": 2.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T08:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.4,
              "air_temperature": 4.3,
              "cloud_area_fraction": 54.8,
              "dew_point_temperature": 1.8,
              "relative_humidity": 84.1,
              "wind_from_direction": 231.9,
              "wind_speed": 5.0,
              "ultraviolet_index_clear_sky": 0.4
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 5.3,
              "air_temperature_min": 3.3,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T09:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.5,
              "air_temperature": 5.0,
              "cloud_area_fraction": 49.0,
              "dew_point_temperature": 2.5,
              "relative_humidity": 82.0,
              "wind_from_direction": 232.6,
              "wind_speed": 5.2,
              "ultraviolet_index_clear_sky": 0.8
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 6.0,
              "air_temperature_min": 4.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T10:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.5,
              "air_temperature": 5.8,
              "cloud_area_fraction": 43.7,
              "dew_point_temperature": 3.3,
              "relative_humidity": 79.9,
              "wind_from_direction": 233.3,
              "wind_speed": 5.3,
              "ultraviolet_index_clear_sky": 1.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 6.8,
              "air_temperature_min": 4.8,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T11:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.5,
              "air_temperature": 6.5,
              "cloud_area_fraction": 39.0,
              "dew_point_temperature": 4.0,
              "relative_humidity": 78.0,
              "wind_from_direction": 234.2,
              "wind_speed": 5.5,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 7.5,
              "air_temperature_min": 5.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T12:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.6,
              "air_temperature": 7.1,
              "cloud_area_fraction": 35.2,
              "dew_point_temperature": 4.6,
              "relative_humidity": 76.3,
              "wind_from_direction": 235.2,
              "wind_speed": 5.6,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 8.1,
              "air_temperature_min": 6.1,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T13:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.6,
              "air_temperature": 7.5,
              "cloud_area_fraction": 32.3,
              "dew_point_temperature": 5.0,
              "relative_humidity": 75.1,
              "wind_from_direction": 236.2,
              "wind_speed": 5.6,
              "ultraviolet_index_clear_sky": 1.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 8.5,
              "air_temperature_min": 6.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T14:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.7,
              "air_temperature": 7.8,
              "cloud_area_fraction": 30.6,
              "dew_point_temperature": 5.3,
              "relative_humidity": 74.3,
              "wind_from_direction": 237.2,
              "wind_speed": 5.7,
              "ultraviolet_index_clear_sky": 0.8
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "precipitation_amount": 0.0,
              "probability_of_precipitation": 3.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 8.8,
              "air_temperature_min": 6.8,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T15:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.8,
              "air_temperature": 7.9,
              "cloud_area_fraction": 30.0,
              "dew_point_temperature": 5.4,
              "relative_humidity": 74.0,
              "wind_from_direction": 238.3,
              "wind_speed": 5.7,
              "ultraviolet_index_clear_sky": 0.4
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 8.9,
              "air_temperature_min": 6.9,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T16:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.8,
              "air_temperature": 7.8,
              "cloud_area_fraction": 30.6,
              "dew_point_temperature": 5.3,
              "relative_humidity": 74.3,
              "wind_from_direction": 239.4,
              "wind_speed": 5.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 8.8,
              "air_temperature_min": 6.8,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T17:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.9,
              "air_temperature": 7.5,
              "cloud_area_fraction": 32.4,
              "dew_point_temperature": 5.0,
              "relative_humidity": 75.1,
              "wind_from_direction": 240.5,
              "wind_speed": 5.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 8.5,
              "air_temperature_min": 6.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-28T18:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1006.9,
              "air_temperature": 7.0,
              "cloud_area_fraction": 35.3,
              "dew_point_temperature": 4.5,
              "relative_humidity": 76.3,
              "wind_from_direction": 241.6,
              "wind_speed": 5.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 8.0,
              "air_temperature_min": 6.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-29T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1007.2,
              "air_temperature": 2.6,
              "cloud_area_fraction": 66.9,
              "dew_point_temperature": 0.1,
              "relative_humidity": 87.7,
              "wind_from_direction": 247.4,
              "wind_speed": 4.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 3.6,
              "air_temperature_min": 1.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-29T06:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1007.5,
              "air_temperature": 2.5,
              "cloud_area_fraction": 89.7,
              "dew_point_temperature": 0.0,
              "relative_humidity": 87.7,
              "wind_from_direction": 250.0,
              "wind_speed": 3.4,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 3.5,
              "air_temperature_min": 1.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-29T12:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1007.8,
              "air_temperature": 6.6,
              "cloud_area_fraction": 74.6,
              "dew_point_temperature": 4.1,
              "relative_humidity": 76.3,
              "wind_from_direction": 248.3,
              "wind_speed": 2.7,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 7.6,
              "air_temperature_min": 5.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-29T18:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1008.1,
              "air_temperature": 6.5,
              "cloud_area_fraction": 40.9,
              "dew_point_temperature": 4.0,
              "relative_humidity": 76.3,
              "wind_from_direction": 243.1,
              "wind_speed": 3.1,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 7.5,
              "air_temperature_min": 5.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-30T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1008.4,
              "air_temperature": 2.1,
              "cloud_area_fraction": 31.5,
              "dew_point_temperature": -0.4,
              "relative_humidity": 87.7,
              "wind_from_direction": 236.5,
              "wind_speed": 4.2,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "lightsnow"
            },
            "details": {
              "air_temperature_max": 3.1,
              "air_temperature_min": 1.1,
              "precipitation_amount": 2.4
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "lightsnow"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-30T06:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1008.7,
              "air_temperature": 2.0,
              "cloud_area_fraction": 58.5,
              "dew_point_temperature": -0.5,
              "relative_humidity": 87.7,
              "wind_from_direction": 231.5,
              "wind_speed": 5.3,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "lightsnow"
            },
            "details": {
              "air_temperature_max": 3.0,
              "air_temperature_min": 1.0,
              "precipitation_amount": 2.4
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "lightsnow"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-30T12:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1009.0,
              "air_temperature": 6.1,
              "cloud_area_fraction": 87.4,
              "dew_point_temperature": 3.6,
              "relative_humidity": 76.3,
              "wind_from_direction": 230.1,
              "wind_speed": 5.7,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "lightsnow"
            },
            "details": {
              "air_temperature_max": 7.1,
              "air_temperature_min": 5.1,
              "precipitation_amount": 2.4
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "lightsnow"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-11-30T18:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1009.3,
              "air_temperature": 6.0,
              "cloud_area_fraction": 81.3,
              "dew_point_temperature": 3.5,
              "relative_humidity": 76.3,
              "wind_from_direction": 232.9,
              "wind_speed": 5.0,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "lightsnow"
            },
            "details": {
              "air_temperature_max": 7.0,
              "air_temperature_min": 5.0,
              "precipitation_amount": 2.4
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "lightsnow"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-01T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1009.6,
              "air_temperature": 1.6,
              "cloud_area_fraction": 48.1,
              "dew_point_temperature": -0.9,
              "relative_humidity": 87.7,
              "wind_from_direction": 238.8,
              "wind_speed": 3.8,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 2.6,
              "air_temperature_min": 0.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-01T06:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1009.9,
              "air_temperature": 1.5,
              "cloud_area_fraction": 30.0,
              "dew_point_temperature": -1.0,
              "relative_humidity": 87.7,
              "wind_from_direction": 245.2,
              "wind_speed": 2.8,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 2.5,
              "air_temperature_min": 0.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-01T12:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1010.2,
              "air_temperature": 5.6,
              "cloud_area_fraction": 50.2,
              "dew_point_temperature": 3.1,
              "relative_humidity": 76.3,
              "wind_from_direction": 249.4,
              "wind_speed": 2.8,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 6.6,
              "air_temperature_min": 4.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-01T18:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1010.5,
              "air_temperature": 5.5,
              "cloud_area_fraction": 82.9,
              "dew_point_temperature": 3.0,
              "relative_humidity": 76.3,
              "wind_from_direction": 249.5,
              "wind_speed": 3.8,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 6.5,
              "air_temperature_min": 4.5,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-02T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1010.8,
              "air_temperature": 1.2,
              "cloud_area_fraction": 86.4,
              "dew_point_temperature": -1.3,
              "relative_humidity": 87.7,
              "wind_from_direction": 245.6,
              "wind_speed": 5.0,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 2.2,
              "air_temperature_min": 0.2,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-02T06:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1011.1,
              "air_temperature": 1.0,
              "cloud_area_fraction": 56.2,
              "dew_point_temperature": -1.5,
              "relative_humidity": 87.7,
              "wind_from_direction": 239.3,
              "wind_speed": 5.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 2.0,
              "air_temperature_min": 0.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-02T12:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1011.4,
              "air_temperature": 5.2,
              "cloud_area_fraction": 30.9,
              "dew_point_temperature": 2.7,
              "relative_humidity": 76.3,
              "wind_from_direction": 233.3,
              "wind_speed": 5.3,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 6.2,
              "air_temperature_min": 4.2,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-02T18:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1011.7,
              "air_temperature": 5.0,
              "cloud_area_fraction": 42.7,
              "dew_point_temperature": 2.5,
              "relative_humidity": 76.3,
              "wind_from_direction": 230.1,
              "wind_speed": 4.2,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 6.0,
              "air_temperature_min": 4.0,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-03T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1012.0,
              "air_temperature": 0.7,
              "cloud_area_fraction": 76.5,
              "dew_point_temperature": -1.8,
              "relative_humidity": 87.7,
              "wind_from_direction": 231.2,
              "wind_speed": 3.1,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 1.7,
              "air_temperature_min": -0.3,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-03T06:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1012.3,
              "air_temperature": 0.6,
              "cloud_area_fraction": 89.3,
              "dew_point_temperature": -1.9,
              "relative_humidity": 87.7,
              "wind_from_direction": 236.1,
              "wind_speed": 2.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 1.6,
              "air_temperature_min": -0.4,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-03T12:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1012.6,
              "air_temperature": 4.7,
              "cloud_area_fraction": 64.7,
              "dew_point_temperature": 2.2,
              "relative_humidity": 76.3,
              "wind_from_direction": 242.6,
              "wind_speed": 3.4,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 5.7,
              "air_temperature_min": 3.7,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-03T18:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1012.9,
              "air_temperature": 4.6,
              "cloud_area_fraction": 34.1,
              "dew_point_temperature": 2.1,
              "relative_humidity": 76.3,
              "wind_from_direction": 248.0,
              "wind_speed": 4.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 5.6,
              "air_temperature_min": 3.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-04T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1013.2,
              "air_temperature": 0.2,
              "cloud_area_fraction": 36.5,
              "dew_point_temperature": -2.3,
              "relative_humidity": 87.7,
              "wind_from_direction": 250.0,
              "wind_speed": 5.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 1.2,
              "air_temperature_min": -0.8,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-04T06:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1013.5,
              "air_temperature": 0.1,
              "cloud_area_fraction": 68.9,
              "dew_point_temperature": -2.4,
              "relative_humidity": 87.7,
              "wind_from_direction": 247.7,
              "wind_speed": 5.6,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 1.1,
              "air_temperature_min": -0.9,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-04T12:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1013.8,
              "air_temperature": 4.2,
              "cloud_area_fraction": 89.9,
              "dew_point_temperature": 1.7,
              "relative_humidity": 76.3,
              "wind_from_direction": 242.1,
              "wind_speed": 4.6,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 5.2,
              "air_temperature_min": 3.2,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-04T18:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1014.1,
              "air_temperature": 4.1,
              "cloud_area_fraction": 72.8,
              "dew_point_temperature": 1.6,
              "relative_humidity": 76.3,
              "wind_from_direction": 235.6,
              "wind_speed": 3.4,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 5.1,
              "air_temperature_min": 3.1,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-05T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1014.4,
              "air_temperature": -0.3,
              "cloud_area_fraction": 39.3,
              "dew_point_temperature": -2.8,
              "relative_humidity": 87.7,
              "wind_from_direction": 231.0,
              "wind_speed": 2.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 0.7,
              "air_temperature_min": -1.3,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-05T06:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1014.7,
              "air_temperature": -0.4,
              "cloud_area_fraction": 32.2,
              "dew_point_temperature": -2.9,
              "relative_humidity": 87.7,
              "wind_from_direction": 230.2,
              "wind_speed": 3.1,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 0.6,
              "air_temperature_min": -1.4,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-05T12:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1015.0,
              "air_temperature": 3.7,
              "cloud_area_fraction": 60.5,
              "dew_point_temperature": 1.2,
              "relative_humidity": 76.3,
              "wind_from_direction": 233.6,
              "wind_speed": 4.2,
              "ultraviolet_index_clear_sky": 1.2
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {
              "air_temperature_max": 4.7,
              "air_temperature_min": 2.7,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-05T18:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1015.3,
              "air_temperature": 3.6,
              "cloud_area_fraction": 88.1,
              "dew_point_temperature": 1.1,
              "relative_humidity": 76.3,
              "wind_from_direction": 239.8,
              "wind_speed": 5.3,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {
              "air_temperature_max": 4.6,
              "air_temperature_min": 2.6,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "cloudy"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-06T00:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1015.6,
              "air_temperature": -0.8,
              "cloud_area_fraction": 79.9,
              "dew_point_temperature": -3.3,
              "relative_humidity": 87.7,
              "wind_from_direction": 246.0,
              "wind_speed": 5.7,
              "ultraviolet_index_clear_sky": 0.0
            }
          },
          "next_6_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {
              "air_temperature_max": 0.2,
              "air_temperature_min": -1.8,
              "precipitation_amount": 0.0
            }
          },
          "next_12_hours": {
            "summary": {
              "symbol_code": "partlycloudy_night"
            },
            "details": {}
          }
        }
      },
      {
        "time": "2026-12-06T06:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_pressure_at_sea_level": 1015.9,
              "air_temperature": -0.9,
              "cloud_area_fraction": 46.3,
              "dew_point_temperature": -3.4,
              "relative_humidity": 87.7,
              "wind_from_direction": 249.7,
              "wind_speed": 5.0,
              "ultraviolet_index_clear_sky": 0.0
            }
          }
        }
      }
    ]
  }
};

export const LONDON: MetnoResponse = RAW;
