import { Injectable } from '@angular/core';

export interface XmlChange {
  path: string;
  attrName: string | null;
  oldVal: string | null;
  newVal: string;
  type: 'edit' | 'add-attr' | 'add-element' | 'text-content';
  tag?: string;
}

export interface SavedSession {
  v: number;
  fileName: string;
  xmlContent: string;
  changes: XmlChange[];
  savedAt: string;
  changeCount: number;
}

const SAVE_KEY = 'xmleditor_autosave_v1';

const EMBEDDED_XSD = `<?xml version="1.0"?>
<xs:schema attributeFormDefault="unqualified" elementFormDefault="qualified" xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="claimList">
    <xs:complexType>
      <xs:sequence>
        <xs:element minOccurs="0" maxOccurs="unbounded" name="claim">
          <xs:complexType>
            <xs:sequence>
              <xs:element minOccurs="0" name="ClaimTypeHeader">
                <xs:complexType>
                  <xs:sequence>
                    <xs:choice maxOccurs="unbounded">
                      <xs:element minOccurs="0" name="adjXref">
                        <xs:complexType>
                          <xs:attribute name="num_icn_parent" type="xs:string" use="optional" />
                          <xs:attribute name="dte_adjusted" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" maxOccurs="unbounded" name="detail">
                        <xs:complexType>
                          <xs:sequence>
                            <xs:choice maxOccurs="unbounded">
                              <xs:element minOccurs="0" name="drugIdLoop">
                                <xs:complexType>
                                  <xs:attribute name="cde_product_qlf" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_ndc" type="xs:string" use="optional" />
                                  <xs:attribute name="qty_unit" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_uom" type="xs:string" use="optional" />
                                  <xs:attribute name="qlf_prescription_id" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_prescription_id" type="xs:string" use="optional" />
                                  <xs:attribute name="dte_prescription" type="xs:string" use="optional" />
                                  <xs:attribute name="ind_pricing" type="xs:string" use="optional" />
                                </xs:complexType>
                              </xs:element>
                              <xs:element minOccurs="0" name="ClaimTypeDtlKey">
                                <xs:complexType>
                                  <xs:sequence minOccurs="0">
                                    <xs:choice maxOccurs="unbounded">
                                      <xs:element minOccurs="0" name="clmOthPyrDtl">
                                        <xs:complexType>
                                          <xs:sequence>
                                            <xs:choice maxOccurs="unbounded">
                                              <xs:element minOccurs="0" maxOccurs="unbounded" name="clmCas">
                                                <xs:complexType>
                                                  <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                                  <xs:attribute name="num_dtl_svd" type="xs:string" use="optional" />
                                                  <xs:attribute name="num_cas_seq" type="xs:string" use="optional" />
                                                  <xs:attribute name="cde_clm_adj_reason" type="xs:string" use="optional" />
                                                  <xs:attribute name="cde_clm_adj_group" type="xs:string" use="optional" />
                                                  <xs:attribute name="amt_adjustment" type="xs:string" use="optional" />
                                                  <xs:attribute name="qty_adjustment" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                              <xs:element minOccurs="0" name="clmAmt">
                                                <xs:complexType>
                                                  <xs:attribute name="qlf_amount" type="xs:string" use="optional" />
                                                  <xs:attribute name="amt_monetary" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                              <xs:element minOccurs="0" maxOccurs="unbounded" name="clmPyrMod">
                                                <xs:complexType>
                                                  <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                                  <xs:attribute name="num_dtl_svd" type="xs:string" use="optional" />
                                                  <xs:attribute name="seq" type="xs:string" use="optional" />
                                                  <xs:attribute name="cde_modifier" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                              <xs:element minOccurs="0" name="clmTplDtl">
                                                <xs:complexType>
                                                  <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                                  <xs:attribute name="amt_alwd" type="xs:string" use="optional" />
                                                  <xs:attribute name="amt_paid_unbundled" type="xs:string" use="optional" />
                                                  <xs:attribute name="amt_pat_resp" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                              <xs:element minOccurs="0" name="clmPayerEntity">
                                                <xs:complexType>
                                                  <xs:sequence>
                                                    <xs:element minOccurs="0" maxOccurs="unbounded" name="clmPyrEntnmadr">
                                                      <xs:complexType>
                                                        <xs:sequence>                                                       
                                                          <xs:element minOccurs="0" name="partyIdentifier">
                                                            <xs:complexType>
                                                              <xs:attribute name="cde_party_id" type="xs:string" use="optional" />
                                                              <xs:attribute name="qlf_id_type" type="xs:string" use="optional" />
                                                              <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                                            </xs:complexType>
                                                          </xs:element>                                                          
                                                        </xs:sequence>
                                                        <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                                        <xs:attribute name="ind_primary_id" type="xs:string" use="optional" />
                                                        <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                                      </xs:complexType>
                                                    </xs:element>
                                                  </xs:sequence>
                                                  <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                                  <xs:attribute name="qlf_type_org" type="xs:string" use="optional" />
                                                  <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>                                              
                                            </xs:choice>
                                          </xs:sequence>
                                          <xs:attribute name="num_dtl_svd" type="xs:string" use="optional" />
                                          <xs:attribute name="amt_service_paid" type="xs:string" use="optional" />
                                          <xs:attribute name="qty_service" type="xs:string" use="optional" />
                                          <xs:attribute name="dte_service_adjud" type="xs:string" use="optional" />
                                          <xs:attribute name="qlf_procedure_code" type="xs:string" use="optional" />
                                          <xs:attribute name="cde_procedure" type="xs:string" use="optional" />
                                          <xs:attribute name="qlf_svc_adjud_dte" type="xs:string" use="optional" />
                                          <xs:attribute name="qlf_svc_adjud_dte_fmt" type="xs:string" use="optional" />
                                          <xs:attribute name="cde_revenue" type="xs:string" use="optional" />
                                          <xs:attribute name="num_assigned" type="xs:string" use="optional" />
                                          <xs:attribute name="dsc_service" type="xs:string" use="optional" />
                                          <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                        </xs:complexType>
                                      </xs:element>
                                      <xs:element minOccurs="0" maxOccurs="unbounded" name="NPI">
                                        <xs:complexType>
                                          <xs:attribute name="npi" type="xs:string" use="optional" />
                                          <xs:attribute name="id_provider" type="xs:string" use="optional" />
                                          <xs:attribute name="cde_service_loc" type="xs:string" use="optional" />
                                        </xs:complexType>
                                      </xs:element>
                                      <xs:element minOccurs="0" maxOccurs="unbounded" name="Name">
                                        <xs:complexType>
                                          <xs:attribute name="name" type="xs:string" use="optional" />
                                          <xs:attribute name="id_provider" type="xs:string" use="optional" />
                                          <xs:attribute name="cde_service_loc" type="xs:string" use="optional" />
                                        </xs:complexType>
                                      </xs:element>
                                    </xs:choice>
                                  </xs:sequence>
                                  <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_proc" type="xs:string" use="optional" />
                                  <xs:attribute name="amt_unit_rate" type="xs:string" use="optional" />
                                  <xs:attribute name="id_prov_attend" type="xs:string" use="optional" />
                                  <xs:attribute name="id_prov_referring" type="xs:string" use="optional" />
                                  <xs:attribute name="id_prov_other" type="xs:string" use="optional" />
                                  <xs:attribute name="id_prov_other_2" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_ndc" type="xs:string" use="optional" />
                                  <xs:attribute name="id_prov_perf" type="xs:string" use="optional" />
                                  <xs:attribute name="id_prov_referring_2" type="xs:string" use="optional" />
                                  <xs:attribute name="id_prov_ordering" type="xs:string" use="optional" />
                                  <xs:attribute name="id_perf_prov" type="xs:string" use="optional" />
                                  <xs:attribute name="qlf_approved_amount" type="xs:string" use="optional" />
                                  <xs:attribute name="amt_approved" type="xs:string" use="optional" />
                                </xs:complexType>
                              </xs:element>
                              <xs:element minOccurs="0" maxOccurs="unbounded" name="surface">
                                <xs:complexType>
                                  <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                  <xs:attribute name="num_seq" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_tooth_surface" type="xs:string" use="optional" />
                                </xs:complexType>
                              </xs:element>
                              <xs:element minOccurs="0" maxOccurs="unbounded" name="modifier">
                                <xs:complexType>
                                  <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                  <xs:attribute name="seq" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_modifier" type="xs:string" use="optional" />
                                </xs:complexType>
                              </xs:element>
                              <xs:element minOccurs="0" maxOccurs="unbounded" name="Error">
                                <xs:complexType>
                                  <xs:sequence>
                                    <xs:element minOccurs="0" name="errDisp">
                                      <xs:complexType>
                                        <xs:attribute name="cde_esc" type="xs:string" use="optional" />
                                        <xs:attribute name="dsc_error_stat" type="xs:string" use="optional" />
                                      </xs:complexType>
                                    </xs:element>
                                    <xs:element minOccurs="0" name="Eob">
                                      <xs:complexType>
                                        <xs:sequence>
                                          <xs:element minOccurs="0" name="reFFFFFF_xref">
                                            <xs:complexType>
                                              <xs:attribute name="cde_reFFFFFF" type="xs:string" use="optional" />
                                              <xs:attribute name="dsc_reFFFFFF" type="xs:string" use="optional" />
                                            </xs:complexType>
                                          </xs:element>
                                          <xs:element minOccurs="0" name="remark_xref">
                                            <xs:complexType>
                                              <xs:attribute name="cde_remark" type="xs:string" use="optional" />
                                              <xs:attribute name="dsc_remark" type="xs:string" use="optional" />
                                            </xs:complexType>
                                          </xs:element>
                                          <xs:element minOccurs="0" name="eob_xref">
                                            <xs:complexType>
                                              <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                              <xs:attribute name="amt_adjusted" type="xs:string" use="optional" />
                                              <xs:attribute name="qty_adjusted" type="xs:string" use="optional" />
                                            </xs:complexType>
                                          </xs:element>
                                        </xs:sequence>
                                        <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                        <xs:attribute name="cde_eob" type="xs:string" use="optional" />
                                        <xs:attribute name="dsc_eob" type="xs:string" use="optional" />
                                        <xs:attribute name="dsc_eob2" type="xs:string" use="optional" />
                                        <xs:attribute name="dsc_eob3" type="xs:string" use="optional" />
                                        <xs:attribute name="dsc_eob4" type="xs:string" use="optional" />
                                        <xs:attribute name="dsc_eob5" type="xs:string" use="optional" />
                                      </xs:complexType>
                                    </xs:element>
                                  </xs:sequence>
                                  <xs:attribute name="dte_generic" type="xs:string" use="optional" />
                                  <xs:attribute name="tme_stamp" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_disp_status" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_status1" type="xs:string" use="optional" />
                                  <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                </xs:complexType>
                              </xs:element>
                              <xs:element minOccurs="0" name="fin">
                                <xs:complexType>
                                  <xs:sequence minOccurs="0">
                                    <xs:element minOccurs="0" name="pubHlthPgm">
                                      <xs:complexType>
                                        <xs:attribute name="cde_pgm_health" type="xs:string" use="optional" />
                                        <xs:attribute name="dsc_pgm_health" type="xs:string" use="optional" />
                                      </xs:complexType>
                                    </xs:element>
                                    <xs:element minOccurs="0" name="cdeAid">
                                      <xs:complexType>
                                        <xs:attribute name="cde_aid_category" type="xs:string" use="optional" />
                                        <xs:attribute name="dsc_aid_category" type="xs:string" use="optional" />
                                      </xs:complexType>
                                    </xs:element>
                                    <xs:element minOccurs="0" name="finFundCode">
                                      <xs:complexType>
                                        <xs:attribute name="cde_fund_code" type="xs:string" use="optional" />
                                        <xs:attribute name="dsc_fund" type="xs:string" use="optional" />
                                      </xs:complexType>
                                    </xs:element>
                                  </xs:sequence>
                                  <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                  <xs:attribute name="ind_pricing" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_rate_type" type="xs:string" use="optional" />
                                </xs:complexType>
                              </xs:element>
                              <xs:element minOccurs="0" name="physXover">
                                <xs:complexType>
                                  <xs:attribute name="amt_deduct" type="xs:string" use="optional" />
                                  <xs:attribute name="amt_paid_mcare" type="xs:string" use="optional" />
                                </xs:complexType>
                              </xs:element>
                              <xs:element minOccurs="0" name="NPI">
                                <xs:complexType>
                                  <xs:attribute name="npi" type="xs:string" use="optional" />
                                  <xs:attribute name="id_provider" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_service_loc" type="xs:string" use="optional" />
                                </xs:complexType>
                              </xs:element>
                              <xs:element minOccurs="0" name="Name">
                                <xs:complexType>
                                  <xs:attribute name="name" type="xs:string" use="optional" />
                                  <xs:attribute name="id_provider" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_service_loc" type="xs:string" use="optional" />
                                </xs:complexType>
                              </xs:element>
                              <xs:element minOccurs="0" maxOccurs="unbounded" name="tplAction">
                                <xs:complexType>
                                  <xs:sequence>
                                    <xs:element minOccurs="0" name="pubHlthOIPlan">
                                      <xs:complexType>
                                        <xs:attribute name="cde_pgm_health" type="xs:string" use="optional" />
                                        <xs:attribute name="dsc_pgm_health" type="xs:string" use="optional" />
                                      </xs:complexType>
                                    </xs:element>
                                  </xs:sequence>
                                  <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_esc" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_carrier" type="xs:string" use="optional" />
                                  <xs:attribute name="cde_coverage" type="xs:string" use="optional" />
                                </xs:complexType>
                              </xs:element>
                            </xs:choice>
                          </xs:sequence>
                          <xs:attribute name="dte_first_svc" type="xs:string" use="optional" />
                          <xs:attribute name="dte_last_svc" type="xs:string" use="optional" />
                          <xs:attribute name="amt_billed" type="xs:string" use="optional" />
                          <xs:attribute name="qty_units_billed" type="xs:string" use="optional" />
                          <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                          <xs:attribute name="cde_revenue" type="xs:string" use="optional" />
                          <xs:attribute name="qty_units_alwd" type="xs:string" use="optional" />
                          <xs:attribute name="amt_alwd" type="xs:string" use="optional" />
                          <xs:attribute name="amt_paid" type="xs:string" use="optional" />
                          <xs:attribute name="amt_co_pay" type="xs:string" use="optional" />
                          <xs:attribute name="cde_loc_pricing" type="xs:string" use="optional" />
                          <xs:attribute name="qty_dispense" type="xs:string" use="optional" />
                          <xs:attribute name="cde_drug_form" type="xs:string" use="optional" />
                          <xs:attribute name="qty_allowed" type="xs:string" use="optional" />
                          <xs:attribute name="cde_tooth_nbr" type="xs:string" use="optional" />
                          <xs:attribute name="cde_quadrant" type="xs:string" use="optional" />
                          <xs:attribute name="cde_place_of_service" type="xs:string" use="optional" />
                          <xs:attribute name="qty_billed" type="xs:string" use="optional" />
                          <xs:attribute name="cde_svc_loc_rend" type="xs:string" use="optional" />
                          <xs:attribute name="cde_modifier_2" type="xs:string" use="optional" />
                          <xs:attribute name="cde_modifier_3" type="xs:string" use="optional" />
                          <xs:attribute name="cde_clm_status" type="xs:string" use="optional" />
                          <xs:attribute name="cde_proc_mod" type="xs:string" use="optional" />
                          <xs:attribute name="cde_modifier_4" type="xs:string" use="optional" />
                          <xs:attribute name="cde_pos" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" maxOccurs="unbounded" name="fin">
                        <xs:complexType>
                          <xs:sequence minOccurs="0">
                            <xs:element minOccurs="0" name="pubHlthPgm">
                              <xs:complexType>
                                <xs:attribute name="cde_pgm_health" type="xs:string" use="optional" />
                                <xs:attribute name="dsc_pgm_health" type="xs:string" use="optional" />
                              </xs:complexType>
                            </xs:element>
                            <xs:element minOccurs="0" name="cdeAid">
                              <xs:complexType>
                                <xs:attribute name="cde_aid_category" type="xs:string" use="optional" />
                                <xs:attribute name="dsc_aid_category" type="xs:string" use="optional" />
                              </xs:complexType>
                            </xs:element>
                            <xs:element minOccurs="0" name="finFundCode">
                              <xs:complexType>
                                <xs:attribute name="cde_fund_code" type="xs:string" use="optional" />
                                <xs:attribute name="dsc_fund" type="xs:string" use="optional" />
                              </xs:complexType>
                            </xs:element>
                          </xs:sequence>
                          <xs:attribute name="ind_pricing" type="xs:string" use="optional" />
                          <xs:attribute name="cde_rate_type" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" maxOccurs="unbounded" name="tplAction">
                        <xs:complexType>
                          <xs:sequence minOccurs="0">
                            <xs:element minOccurs="0" maxOccurs="unbounded" name="pubHlthOIPlan">
                              <xs:complexType>
                                <xs:attribute name="cde_pgm_health" type="xs:string" use="optional" />
                                <xs:attribute name="dsc_pgm_health" type="xs:string" use="optional" />
                              </xs:complexType>
                            </xs:element>
                          </xs:sequence>
                          <xs:attribute name="cde_esc" type="xs:string" use="optional" />
                          <xs:attribute name="cde_carrier" type="xs:string" use="optional" />
                          <xs:attribute name="cde_coverage" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" name="ClaimTypeHdrKey">
                        <xs:complexType>
                          <xs:sequence minOccurs="0">
                            <xs:element minOccurs="0" name="profOthPyrHdr">
                              <xs:complexType>
                                <xs:sequence>
                                  <xs:element minOccurs="0" maxOccurs="unbounded" name="clmAmt">
                                    <xs:complexType>
                                      <xs:attribute name="qlf_amount" type="xs:string" use="optional" />
                                      <xs:attribute name="amt_monetary" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmRef">
                                    <xs:complexType>
                                      <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_ref_id" type="xs:string" use="optional" />
                                      <xs:attribute name="qlf_reference_id" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmPayerEntity">
                                    <xs:complexType>
                                      <xs:sequence>
                                        <xs:element minOccurs="0" maxOccurs="unbounded" name="clmPyrEntnmadr">
                                          <xs:complexType>
                                            <xs:sequence>
                                              <xs:element minOccurs="0" name="clmAdrN3N4">
                                                <xs:complexType>
                                                  <xs:attribute name="adr_street_1" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_street_2" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_city" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_state" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_zip_code" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_country" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                              <xs:element minOccurs="0" name="partyIdentifier">
                                                <xs:complexType>
                                                  <xs:attribute name="cde_party_id" type="xs:string" use="optional" />
                                                  <xs:attribute name="qlf_id_type" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                              <xs:element minOccurs="0" name="clmNameNm1">
                                                <xs:complexType>
                                                  <xs:attribute name="nam_last" type="xs:string" use="optional" />
                                                  <xs:attribute name="nam_first" type="xs:string" use="optional" />
                                                  <xs:attribute name="nam_middle" type="xs:string" use="optional" />
                                                  <xs:attribute name="nam_suffix" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                            </xs:sequence>
                                            <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                            <xs:attribute name="ind_priFFFFFF_id" type="xs:string" use="optional" />
                                          </xs:complexType>
                                        </xs:element>
                                      </xs:sequence>
                                      <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                      <xs:attribute name="qlf_type_org" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmMoa">
                                    <xs:complexType>
                                      <xs:attribute name="cde_moa_reFFFFFF_1" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_moa_reFFFFFF_2" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_moa_reFFFFFF_3" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_moa_reFFFFFF_4" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_moa_reFFFFFF_5" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmSbrTpl">
                                    <xs:complexType>
                                      <xs:attribute name="cde_payer_responsib" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_insured_group_number" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_ind_relationship" type="xs:string" use="optional" />
                                      <xs:attribute name="nam_insured_group" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_insurance_type" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_claim_filing_ind" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                </xs:sequence>
                              </xs:complexType>
                            </xs:element>
                            <xs:element minOccurs="0" maxOccurs="unbounded" name="instOthPyrHdr">
                              <xs:complexType>
                                <xs:sequence>
                                  <xs:element minOccurs="0" name="clmMia">
                                    <xs:complexType>
                                      <xs:attribute name="cde_mia_remark_1" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_mia_remark_2" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_mia_remark_3" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_mia_remark_4" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_mia_remark_5" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmMoa">
                                    <xs:complexType>
                                      <xs:attribute name="cde_moa_remark_1" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_moa_remark_2" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_moa_remark_3" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_moa_remark_4" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_moa_remark_5" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmPayerEntity">
                                    <xs:complexType>
                                      <xs:sequence>
                                        <xs:element minOccurs="0" maxOccurs="unbounded" name="clmPyrEntnmadr">
                                          <xs:complexType>
                                            <xs:sequence>
                                              <xs:element minOccurs="0" name="clmAdrN3N4">
                                                <xs:complexType>
                                                  <xs:attribute name="adr_street_1" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_street_2" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_city" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_state" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_zip_code" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_country" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                              <xs:element minOccurs="0" name="partyIdentifier">
                                                <xs:complexType>
                                                  <xs:attribute name="cde_party_id" type="xs:string" use="optional" />
                                                  <xs:attribute name="qlf_id_type" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                              <xs:element minOccurs="0" name="clmNameNm1">
                                                <xs:complexType>
                                                  <xs:attribute name="nam_last" type="xs:string" use="optional" />
                                                  <xs:attribute name="nam_first" type="xs:string" use="optional" />
                                                  <xs:attribute name="nam_middle" type="xs:string" use="optional" />
                                                  <xs:attribute name="nam_suffix" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                            </xs:sequence>
                                            <xs:attribute name="ind_primary_id" type="xs:string" use="optional" />
                                            <xs:attribute name="ind_priFFFFFF_id" type="xs:string" use="optional" />
                                          </xs:complexType>
                                        </xs:element>
                                      </xs:sequence>
                                      <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                      <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                      <xs:attribute name="qlf_type_org" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" maxOccurs="unbounded" name="clmAmt">
                                    <xs:complexType>
                                      <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                      <xs:attribute name="qlf_amount" type="xs:string" use="optional" />
                                      <xs:attribute name="amt_monetary" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" maxOccurs="unbounded" name="clmCas">
                                    <xs:complexType>
                                      <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                      <xs:attribute name="num_dtl_svd" type="xs:string" use="optional" />
                                      <xs:attribute name="num_cas_seq" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_clm_adj_reason" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_clm_adj_group" type="xs:string" use="optional" />
                                      <xs:attribute name="amt_adjustment" type="xs:string" use="optional" />
                                      <xs:attribute name="qty_adjustment" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmRef">
                                    <xs:complexType>
                                      <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_ref_id" type="xs:string" use="optional" />
                                      <xs:attribute name="qlf_reference_id" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmSbrTpl">
                                    <xs:complexType>
                                      <xs:attribute name="cde_payer_responsib" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_insured_group_number" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_ind_relationship" type="xs:string" use="optional" />
                                      <xs:attribute name="nam_insured_group" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_insurance_type" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_claim_filing_ind" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                </xs:sequence>
                              </xs:complexType>
                            </xs:element>
                            <xs:element minOccurs="0" name="dntlOthPyrHdr">
                              <xs:complexType>
                                <xs:sequence>
                                  <xs:element minOccurs="0" maxOccurs="unbounded" name="clmAmt">
                                    <xs:complexType>
                                      <xs:attribute name="qlf_amount" type="xs:string" use="optional" />
                                      <xs:attribute name="amt_monetary" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmRef">
                                    <xs:complexType>
                                      <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_ref_id" type="xs:string" use="optional" />
                                      <xs:attribute name="qlf_reference_id" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmPayerEntity">
                                    <xs:complexType>
                                      <xs:sequence>
                                        <xs:element minOccurs="0" maxOccurs="unbounded" name="clmPyrEntnmadr">
                                          <xs:complexType>
                                            <xs:sequence>
                                              <xs:element minOccurs="0" name="clmAdrN3N4">
                                                <xs:complexType>
                                                  <xs:attribute name="adr_street_1" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_street_2" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_city" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_state" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_zip_code" type="xs:string" use="optional" />
                                                  <xs:attribute name="adr_country" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                              <xs:element minOccurs="0" name="partyIdentifier">
                                                <xs:complexType>
                                                  <xs:attribute name="cde_party_id" type="xs:string" use="optional" />
                                                  <xs:attribute name="qlf_id_type" type="xs:string" use="optional" />
                                                  <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                              <xs:element minOccurs="0" name="clmNameNm1">
                                                <xs:complexType>
                                                  <xs:attribute name="nam_last" type="xs:string" use="optional" />
                                                  <xs:attribute name="nam_first" type="xs:string" use="optional" />
                                                  <xs:attribute name="nam_middle" type="xs:string" use="optional" />
                                                  <xs:attribute name="nam_suffix" type="xs:string" use="optional" />
                                                </xs:complexType>
                                              </xs:element>
                                            </xs:sequence>
                                            <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                            <xs:attribute name="ind_priFFFFFF_id" type="xs:string" use="optional" />
                                          </xs:complexType>
                                        </xs:element>
                                      </xs:sequence>
                                      <xs:attribute name="qlf_entity_type" type="xs:string" use="optional" />
                                      <xs:attribute name="qlf_type_org" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="clmSbrTpl">
                                    <xs:complexType>
                                      <xs:attribute name="cde_payer_responsib" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_insured_group_number" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_ind_relationship" type="xs:string" use="optional" />
                                      <xs:attribute name="nam_insured_group" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_insurance_type" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_claim_filing_ind" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" maxOccurs="unbounded" name="clmCas">
                                    <xs:complexType>
                                      <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                      <xs:attribute name="num_dtl_svd" type="xs:string" use="optional" />
                                      <xs:attribute name="num_cas_seq" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_clm_adj_reason" type="xs:string" use="optional" />
                                      <xs:attribute name="cde_clm_adj_group" type="xs:string" use="optional" />
                                      <xs:attribute name="amt_adjustment" type="xs:string" use="optional" />
                                      <xs:attribute name="qty_adjustment" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  
                                </xs:sequence>
                              </xs:complexType>
                            </xs:element>
                            <xs:element minOccurs="0" name="clmSbr">
                              <xs:complexType>
                                <xs:sequence>
                                  <xs:element minOccurs="0" name="clmNameNm1">
                                    <xs:complexType>
                                      <xs:attribute name="nam_last" type="xs:string" use="optional" />
                                      <xs:attribute name="nam_first" type="xs:string" use="optional" />
                                      <xs:attribute name="nam_middle" type="xs:string" use="optional" />
                                      <xs:attribute name="nam_suffix" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                </xs:sequence>
                                <xs:attribute name="cde_payer_responsib" type="xs:string" use="optional" />
                                <xs:attribute name="cde_insured_group_number" type="xs:string" use="optional" />
                                <xs:attribute name="cde_ind_relationship" type="xs:string" use="optional" />
                                <xs:attribute name="nam_insured_group" type="xs:string" use="optional" />
                                <xs:attribute name="cde_insurance_type" type="xs:string" use="optional" />
                                <xs:attribute name="cde_claim_filing_ind" type="xs:string" use="optional" />
                                <xs:attribute name="cde_coordination_benefits" type="xs:string" use="optional" />
                              </xs:complexType>
                            </xs:element>
                            <xs:element minOccurs="0" name="physXover">
                              <xs:complexType>
                                <xs:attribute name="amt_deduct" type="xs:string" use="optional" />
                                <xs:attribute name="amt_paid_mcare" type="xs:string" use="optional" />
                              </xs:complexType>
                            </xs:element>
                          </xs:sequence>
                          <xs:attribute name="id_medicaid" type="xs:string" use="optional" />
                          <xs:attribute name="id_provider" type="xs:string" use="optional" />
                          <xs:attribute name="id_prov_referring" type="xs:string" use="optional" />
                          <xs:attribute name="cde_med_assignment" type="xs:string" use="optional" />
                          <xs:attribute name="cde_delay_reason" type="xs:string" use="optional" />
                          <xs:attribute name="id_prov_rendering" type="xs:string" use="optional" />
                          <xs:attribute name="cde_other_coverage" type="xs:string" use="optional" />
                          <xs:attribute name="elig_clarif_cde" type="xs:string" use="optional" />
                          <xs:attribute name="pat_relation_cde" type="xs:string" use="optional" />
                          <xs:attribute name="id_provider_qual" type="xs:string" use="optional" />
                          <xs:attribute name="disp_id_provider_qual" type="xs:string" use="optional" />
                          <xs:attribute name="id_prov_referring_2" type="xs:string" use="optional" />
                          <xs:attribute name="id_perf_prov" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" maxOccurs="unbounded" name="NPI">
                        <xs:complexType>
                          <xs:attribute name="npi" type="xs:string" use="optional" />
                          <xs:attribute name="id_provider" type="xs:string" use="optional" />
                          <xs:attribute name="cde_service_loc" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" maxOccurs="unbounded" name="Name">
                        <xs:complexType>
                          <xs:attribute name="name" type="xs:string" use="optional" />
                          <xs:attribute name="id_provider" type="xs:string" use="optional" />
                          <xs:attribute name="cde_service_loc" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" maxOccurs="unbounded" name="diag_xref">
                        <xs:complexType>
                          <xs:attribute name="cde_diag" type="xs:string" use="optional" />
                          <xs:attribute name="cde_diag_seq" type="xs:string" use="optional" />
                          <xs:attribute name="cde_poa" type="xs:string" use="optional" />
                          <xs:attribute name="qlf_code_list" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" maxOccurs="unbounded" name="proc">
                        <xs:complexType>
                          <xs:attribute name="cde_proc_icd9" type="xs:string" use="optional" />
                          <xs:attribute name="num_seq" type="xs:string" use="optional" />
                          <xs:attribute name="qlf_code_list" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" name="ubXover">
                        <xs:complexType>
                          <xs:attribute name="amt_deduct" type="xs:string" use="optional" />
                          <xs:attribute name="amt_paid_mcare" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" maxOccurs="unbounded" name="Error">
                        <xs:complexType>
                          <xs:sequence>
                            <xs:element minOccurs="0" name="errDisp">
                              <xs:complexType>
                                <xs:attribute name="cde_esc" type="xs:string" use="optional" />
                                <xs:attribute name="dsc_error_stat" type="xs:string" use="optional" />
                              </xs:complexType>
                            </xs:element>
                            <xs:element minOccurs="0" name="Eob">
                              <xs:complexType>
                                <xs:sequence>
                                  <xs:element minOccurs="0" name="reFFFFFF_xref">
                                    <xs:complexType>
                                      <xs:attribute name="cde_reFFFFFF" type="xs:string" use="optional" />
                                      <xs:attribute name="dsc_reFFFFFF" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="remark_xref">
                                    <xs:complexType>
                                      <xs:attribute name="cde_remark" type="xs:string" use="optional" />
                                      <xs:attribute name="dsc_remark" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                  <xs:element minOccurs="0" name="eob_xref">
                                    <xs:complexType>
                                      <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                      <xs:attribute name="amt_adjusted" type="xs:string" use="optional" />
                                      <xs:attribute name="qty_adjusted" type="xs:string" use="optional" />
                                    </xs:complexType>
                                  </xs:element>
                                </xs:sequence>
                                <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                                <xs:attribute name="cde_eob" type="xs:string" use="optional" />
                                <xs:attribute name="dsc_eob" type="xs:string" use="optional" />
                                <xs:attribute name="dsc_eob2" type="xs:string" use="optional" />
                                <xs:attribute name="dsc_eob3" type="xs:string" use="optional" />
                                <xs:attribute name="dsc_eob4" type="xs:string" use="optional" />
                                <xs:attribute name="dsc_eob5" type="xs:string" use="optional" />
                              </xs:complexType>
                            </xs:element>
                          </xs:sequence>
                          <xs:attribute name="dte_generic" type="xs:string" use="optional" />
                          <xs:attribute name="tme_stamp" type="xs:string" use="optional" />
                          <xs:attribute name="cde_disp_status" type="xs:string" use="optional" />
                          <xs:attribute name="cde_status1" type="xs:string" use="optional" />
                          <xs:attribute name="num_dtl" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" maxOccurs="unbounded" name="ub92HdrOcc">
                        <xs:complexType>
                          <xs:attribute name="cde_occurrence" type="xs:string" use="optional" />
                          <xs:attribute name="dte_occurrence" type="xs:string" use="optional" />
                          <xs:attribute name="dte_occ_to" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                      <xs:element minOccurs="0" name="phrmCobXref">
                        <xs:complexType>
                          <xs:sequence>
                            <xs:element minOccurs="0" maxOccurs="unbounded" name="phrmCob">
                              <xs:complexType>
                                <xs:attribute name="amt_op_paid" type="xs:string" use="optional" />
                                <xs:attribute name="cde_op_amt_paid_qual" type="xs:string" use="optional" />
                              </xs:complexType>
                            </xs:element>
                            <xs:element minOccurs="0" maxOccurs="unbounded" name="phrmCobRej">
                              <xs:complexType>
                                <xs:attribute name="op_rej_cde" type="xs:string" use="optional" />
                              </xs:complexType>
                            </xs:element>
                          </xs:sequence>
                          <xs:attribute name="cde_op_cov_type" type="xs:string" use="optional" />
                          <xs:attribute name="dte_other_payer" type="xs:string" use="optional" />
                          <xs:attribute name="cde_op_id" type="xs:string" use="optional" />
                          <xs:attribute name="cde_op_id_qual" type="xs:string" use="optional" />
                        </xs:complexType>
                      </xs:element>
                    </xs:choice>
                  </xs:sequence>
                  <xs:attribute name="cde_prov_type" type="xs:string" use="optional" />
                  <xs:attribute name="num_days_covd" type="xs:string" use="optional" />
                  <xs:attribute name="dte_last_svc" type="xs:string" use="optional" />
                  <xs:attribute name="cde_patient_status" type="xs:string" use="optional" />
                  <xs:attribute name="id_prov_other" type="xs:string" use="optional" />
                  <xs:attribute name="cde_svc_loc_other_2" type="xs:string" use="optional" />
                  <xs:attribute name="cde_service_loc" type="xs:string" use="optional" />
                  <xs:attribute name="amt_billed" type="xs:string" use="optional" />
                  <xs:attribute name="cde_admit_hour" type="xs:string" use="optional" />
                  <xs:attribute name="cde_admit_type" type="xs:string" use="optional" />
                  <xs:attribute name="tob" type="xs:string" use="optional" />
                  <xs:attribute name="cde_hipaa_version" type="xs:string" use="optional" />
                  <xs:attribute name="dte_admission" type="xs:string" use="optional" />
                  <xs:attribute name="cde_admit_source" type="xs:string" use="optional" />
                  <xs:attribute name="num_days_ncovd" type="xs:string" use="optional" />
                  <xs:attribute name="id_prov_attend" type="xs:string" use="optional" />
                  <xs:attribute name="id_prov_other_2" type="xs:string" use="optional" />
                  <xs:attribute name="amt_paid" type="xs:string" use="optional" />
                  <xs:attribute name="amt_pd_pat_ub92" type="xs:string" use="optional" />
                  <xs:attribute name="cde_clm_txn_typ" type="xs:string" use="optional" />
                  <xs:attribute name="id_prov_prescrb" type="xs:string" use="optional" />
                  <xs:attribute name="cde_svc_loc_rend" type="xs:string" use="optional" />
                  <xs:attribute name="num_day_supply" type="xs:string" use="optional" />
                  <xs:attribute name="num_prscrip" type="xs:string" use="optional" />
                  <xs:attribute name="dte_prescribe" type="xs:string" use="optional" />
                  <xs:attribute name="ind_brand_med_nec" type="xs:string" use="optional" />
                  <xs:attribute name="amt_co_pay" type="xs:string" use="optional" />
                  <xs:attribute name="qty_refill" type="xs:string" use="optional" />
                  <xs:attribute name="prov_billing" type="xs:string" use="optional" />
                  <xs:attribute name="id_prov_perf" type="xs:string" use="optional" />
                  <xs:attribute name="cde_perf_svc_loc" type="xs:string" use="optional" />
                  <xs:attribute name="cde_pos" type="xs:string" use="optional" />
                </xs:complexType>
              </xs:element>
              <xs:element minOccurs="0" name="check">
                <xs:complexType>
                  <xs:attribute name="num_check" type="xs:string" use="optional" />
                  <xs:attribute name="dte_issue" type="xs:string" use="optional" />
                  <xs:attribute name="dte_cycle" type="xs:string" use="optional" />
                </xs:complexType>
              </xs:element>
            </xs:sequence>
            <xs:attribute name="num_icn" type="xs:string" use="optional" />
            <xs:attribute name="cde_clm_status" type="xs:string" use="optional" />
            <xs:attribute name="cde_clm_type" type="xs:string" use="optional" />
            <xs:attribute name="dte_first_svc" type="xs:string" use="optional" />
            <xs:attribute name="dte_to_date" type="xs:string" use="optional" />
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

@Injectable({ providedIn: 'root' })
export class XmlStateService {
  xmlDoc: Document | null = null;
  xsdDoc: Document | null = null;
  xmlFileName = '';
  changes: XmlChange[] = [];
  selectedPath: string | null = null;
  expandedNodes = new Set<string>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const parser = new DOMParser();
    this.xsdDoc = parser.parseFromString(EMBEDDED_XSD, 'application/xml');
  }

  // Path helpers
  getNodePath(node: Element): string {
    const parts: string[] = [];
    let cur: Element | null = node;
    while (cur && cur.nodeType === 1) {
      const parent = cur.parentNode as Element | null;
      const siblings = (parent && parent.nodeType === 1)
        ? Array.from(parent.children).filter(c => c.tagName === cur!.tagName)
        : [cur];
      const idx = siblings.indexOf(cur);
      parts.unshift(cur.tagName + (siblings.length > 1 ? '[' + idx + ']' : ''));
      cur = (parent && parent.nodeType === 1) ? parent : null;
    }
    return parts.join('/');
  }

  /**
   * Returns a human-friendly version of the path where Claim[N] index is
   * replaced with the claim's num_icn (or acn_icn) attribute value.
   * e.g.  ClaimList/Claim[2]/Member/MedicaidMemberID
   *  →    ClaimList/Claim[ACNMA194-011]/Member/MedicaidMemberID
   */
  formatPathDisplay(rawPath: string): string {
    if (!this.xmlDoc) return rawPath;
    // Match any tag[N] segment and try to resolve it to an ICN label
    return rawPath.replace(/([A-Za-z_][A-Za-z0-9_]*)\[(\d+)\]/g, (match, tag, idxStr) => {
      const node = this.getNodeByPath(rawPath.slice(0, rawPath.indexOf(match) + match.length));
      if (!node) return match;
      // Look for num_icn or acn_icn on this node or its first child named 'claim'
      const icn = node.getAttribute('num_icn')
        || node.getAttribute('acn_icn')
        || node.querySelector(':scope > claim')?.getAttribute('num_icn')
        || node.querySelector(':scope > claim')?.getAttribute('acn_icn');
      if (icn) return tag + '[' + icn + ']';
      return match; // fallback to original if no ICN found
    });
  }

  getNodeByPath(path: string): Element | null {
    if (!this.xmlDoc || !path) return null;
    const parts = path.split('/');
    let node: Element = this.xmlDoc.documentElement;
    if (parts[0].replace(/\[\d+\]/, '') !== node.tagName) return null;
    for (let i = 1; i < parts.length; i++) {
      const match = parts[i].match(/^(.+?)(?:\[(\d+)\])?$/);
      if (!match) return null;
      const tag = match[1];
      const idx = match[2] !== undefined ? parseInt(match[2]) : 0;
      const siblings = Array.from(node.children).filter(c => c.tagName === tag);
      const next = siblings[idx];
      if (!next) return null;
      node = next;
    }
    return node;
  }

  hasNodeChanges(path: string): boolean {
    return this.changes.some(c => c.path === path || c.path.startsWith(path + '/'));
  }

  // XSD helpers
  getXSDAttributesForElement(tagName: string): string[] {
    if (!this.xsdDoc) return [];
    const attrs = new Set<string>();
    const selector = "element[name=\"" + tagName + "\"]";
    const els = this.xsdDoc.querySelectorAll(selector);
    els.forEach(el => {
      el.querySelectorAll(':scope > complexType > attribute').forEach(a => {
        const n = a.getAttribute('name'); if (n) attrs.add(n);
      });
      el.querySelectorAll(':scope > complexType > sequence > attribute').forEach(a => {
        const n = a.getAttribute('name'); if (n) attrs.add(n);
      });
    });
    return Array.from(attrs);
  }

  getXSDChildrenForElement(tagName: string): string[] {
    if (!this.xsdDoc) return [];
    const children = new Set<string>();
    const selector = "element[name=\"" + tagName + "\"]";
    const els = this.xsdDoc.querySelectorAll(selector);
    els.forEach(el => {
      el.querySelectorAll(':scope > complexType > sequence > element[name]').forEach(e => {
        const n = e.getAttribute('name'); if (n) children.add(n);
      });
    });
    return Array.from(children);
  }

  getNodeTextContent(node: Element): string | null {
    if (node.children.length > 0) return null;
    return node.textContent ?? '';
  }

  // Change tracking
  recordChange(change: XmlChange): void {
    // Find existing change for this field
    const existing = this.changes.find(c =>
      c.path === change.path && c.attrName === change.attrName && c.type === change.type
    );

    if (change.type === 'edit' || change.type === 'text-content') {
      if (existing) {
        // IMPORTANT: preserve the ORIGINAL oldVal from the very first change — never overwrite it.
        // Only update newVal so the diff always shows original → current.
        const trueOriginal = existing.oldVal;
        if (change.newVal === trueOriginal) {
          // Value reverted back to original — remove the change entirely
          this.changes = this.changes.filter(c =>
            !(c.path === change.path && c.attrName === change.attrName && c.type === change.type)
          );
        } else {
          existing.newVal = change.newVal;
        }
      } else {
        // First time this field is being changed — record oldVal as the true original
        if (change.newVal !== (change.oldVal ?? '')) {
          this.changes.push(change);
        }
      }
    } else {
      // For add-attr / add-element: just replace
      this.changes = this.changes.filter(c =>
        !(c.path === change.path && c.attrName === change.attrName && c.type === change.type)
      );
      this.changes.push(change);
    }
    this.scheduleAutoSave();
  }

  removeChange(path: string, attrName: string | null, type: string): void {
    this.changes = this.changes.filter(c =>
      !(c.path === path && c.attrName === attrName && c.type === type)
    );
  }

  // Serialization
  serializeXML(): string {
    if (!this.xmlDoc) return '';
    const s = new XMLSerializer();
    let content = s.serializeToString(this.xmlDoc);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + this.formatXML(content);
  }

  formatXML(xml: string): string {
    let formatted = '';
    let indent = 0;
    const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      if (line.startsWith('</')) indent = Math.max(0, indent - 1);
      formatted += '  '.repeat(indent) + line + '\n';
      if (!line.startsWith('</') && !line.endsWith('/>') &&
          line.startsWith('<') && !line.startsWith('<?') && !line.startsWith('<!--')) {
        indent++;
      }
    });
    return formatted;
  }

  syntaxHighlight(xml: string): string {
    xml = xml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return xml
      .replace(/&lt;(\/?)([\w][\w:.-]*)/g, (_m: string, slash: string, tag: string) =>
        '<span class="xml-punct">&lt;' + slash + '</span><span class="xml-el">' + tag + '</span>')
      .replace(/&gt;/g, '<span class="xml-punct">&gt;</span>')
      .replace(/([\w][\w:.-]*)=&quot;([^&]*)&quot;/g, (_m: string, a: string, v: string) =>
        '<span class="xml-attr">' + a + '</span><span class="xml-punct">=&quot;</span><span class="xml-val">' + v + '</span><span class="xml-punct">&quot;</span>');
  }

  // Auto-save
  scheduleAutoSave(): void {
    if (!this.xmlDoc || !this.xmlFileName) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.doSave(), 2000);
  }

  doSave(): void {
    if (!this.xmlDoc || !this.xmlFileName) return;
    try {
      const payload: SavedSession = {
        v: 2,
        fileName: this.xmlFileName,
        xmlContent: new XMLSerializer().serializeToString(this.xmlDoc),
        changes: this.changes,
        savedAt: new Date().toISOString(),
        changeCount: this.changes.length
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Auto-save failed:', e);
    }
  }

  getSavedSession(): SavedSession | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s: SavedSession = JSON.parse(raw);
      if (!s?.xmlContent || !s?.fileName) return null;
      return s;
    } catch { return null; }
  }

  clearSavedSession(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
  }

  restoreFromSession(s: SavedSession): boolean {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(s.xmlContent, 'application/xml');
      if (doc.querySelector('parsererror')) return false;
      this.xmlDoc = doc;
      this.xmlFileName = s.fileName;
      this.changes = Array.isArray(s.changes) ? s.changes : [];
      this.selectedPath = null;
      this.expandedNodes.clear();
      const xp = new DOMParser();
      this.xsdDoc = xp.parseFromString(EMBEDDED_XSD, 'application/xml');
      return true;
    } catch { return false; }
  }

  reset(): void {
    this.xmlDoc = null;
    this.xmlFileName = '';
    this.changes = [];
    this.selectedPath = null;
    this.expandedNodes.clear();
    this.clearSavedSession();
    const parser = new DOMParser();
    this.xsdDoc = parser.parseFromString(EMBEDDED_XSD, 'application/xml');
  }
}
