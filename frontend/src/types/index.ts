export interface User {
  id: string;
  name: string;
  cpf: string;
  sex: "M" | "F" | "O";
  email: string;
  created_at: string;
}

export interface Property {
  id: string;
  user_id: string;
  name: string;
  location: string;
  municipality: string;
  state: string;
  zip_code: string;
  total_area_ha: string;
  own_area_ha: string;
  leased_area_ha: string;
  protected_area_ha: string;
  people_count: number;
  crop_area_ha: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
