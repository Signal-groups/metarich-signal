import type { SurgeryItem } from './types'

export type NSurgeryCompany =
  | 'DB손해보험'
  | 'KB손해보험'
  | '메리츠화재'
  | '삼성화재'
  | '현대해상'
  | '한화손해보험'
  | '흥국화재'
  | '하나손해보험'
  | '농협손해보험'
  | '롯데손해보험'
  | '삼성생명'
  | '한화생명'
  | 'ABL생명'
  | '흥국생명'

export interface NSurgeryCoverage {
  company: NSurgeryCompany
  productName: string
  groupName: string
  keywords: string[]
  diseaseCodes?: string[]
  diseaseDetailGroup?: string
  bodyParts?: string[]
  baseAmount?: number
  note?: string
}

export interface NSurgeryDiseaseDetail {
  company: NSurgeryCompany
  productName: string
  groupName: string
  category: string
  disease: string
  code: string
  aliases?: string[]
}

export const N_SURGERY_DISEASE_DETAILS: NSurgeryDiseaseDetail[] = [
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '백내장', category: '백내장', disease: '노년백내장', code: 'H25', aliases: ['백내장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '백내장', category: '백내장', disease: '기타 백내장', code: 'H26', aliases: ['백내장', '후발백내장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '백내장', category: '백내장', disease: '수정체의 기타 장애', code: 'H27', aliases: ['수정체', '백내장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '수면무호흡증', disease: '수면무호흡', code: 'G47.3', aliases: ['수면무호흡증'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '식도정맥류', disease: '식도정맥류', code: 'I85', aliases: ['식도정맥류'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '요로결석증', disease: '요도결석', code: 'N21.1', aliases: ['요로결석', '요도결석'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '요로결석증', disease: '기타 하부요로결석', code: 'N21.8', aliases: ['요로결석', '하부요로결석'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '요로결석증', disease: '상세불명의 하부요로결석', code: 'N21.9', aliases: ['요로결석', '하부요로결석'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '신장 및 요관의 결석', disease: '신장 및 요관의 결석', code: 'N20', aliases: ['신장결석', '요관결석', '요로결석'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '치핵 및 항문주위 정맥혈전증', disease: '치핵 및 항문주위 정맥혈전증', code: 'K64', aliases: ['치핵', '치질'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '치열 및 치루', disease: '항문 및 직장부위 열창 및 누공', code: 'K60', aliases: ['치열', '치루', '항문열창', '항문누공'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '치열 및 치루', disease: '항문 및 직장부위 농양', code: 'K61', aliases: ['치루', '항문농양', '직장농양'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '1형당뇨병', code: 'E10', aliases: ['당뇨', '당뇨병'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '2형당뇨병', code: 'E11', aliases: ['당뇨', '당뇨병'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '영양실조 관련 당뇨병', code: 'E12', aliases: ['당뇨', '당뇨병'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '기타 명시된 당뇨병', code: 'E13', aliases: ['당뇨', '당뇨병'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '상세불명의 당뇨병', code: 'E14', aliases: ['당뇨', '당뇨병'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '당뇨병성 백내장', code: 'H28.0', aliases: ['백내장', '당뇨병성백내장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '폐질환', disease: '달리 분류되지 않은 호흡부전', code: 'J96', aliases: ['호흡부전'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '위·십이지장궤양', disease: '위궤양', code: 'K25', aliases: ['위궤양'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '위·십이지장궤양', disease: '십이지장궤양', code: 'K26', aliases: ['십이지장궤양'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '녹내장', disease: '녹내장', code: 'H40', aliases: ['녹내장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '갑상선질환', disease: '갑상선의 장애', code: 'E00-E07', aliases: ['갑상선'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '갑상선질환', disease: '갑상선기능저하증', code: 'E89.0', aliases: ['갑상선', '갑상선기능저하'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '부갑상선질환', disease: '부갑상선기능저하증', code: 'E20', aliases: ['부갑상선'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '부갑상선질환', disease: '부갑상선기능항진증 및 기타 장애', code: 'E21', aliases: ['부갑상선'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '간암', disease: '간 및 간내 담관의 악성 신생물', code: 'C22', aliases: ['간암', '담관암'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '췌장질환', disease: '췌장의 기타 질환', code: 'K86', aliases: ['췌장질환', '췌장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '49대질병', category: '담낭담도질환', disease: '담낭염', code: 'K81', aliases: ['담낭', '담낭염'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '49대질병', category: '담낭담도질환', disease: '담낭의 기타 질환', code: 'K82', aliases: ['담낭', '담낭질환'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '49대질병', category: '담낭담도질환', disease: '담도의 기타 질환', code: 'K83', aliases: ['담도', '담도질환'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '49대질병', category: '담석증', disease: '담석증', code: 'K80', aliases: ['담석', '담석증'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '심장질환/뇌혈관질환', category: '심장질환', disease: '류마티스열 및 만성 류마티스 심장질환', code: 'I00-I09', aliases: ['심장질환', '류마티스심장질환'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '심장질환/뇌혈관질환', category: '심장질환', disease: '허혈성 심장질환', code: 'I20-I25', aliases: ['심장질환', '협심증', '심근경색'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '심장질환/뇌혈관질환', category: '심장질환', disease: '폐성 심장병 및 폐순환 질환', code: 'I26-I28', aliases: ['심장질환', '폐색전증'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '심장질환/뇌혈관질환', category: '심장질환', disease: '기타 형태의 심장병', code: 'I30-I52', aliases: ['심장질환', '심장병'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '심장질환/뇌혈관질환', category: '뇌혈관질환', disease: '뇌혈관질환', code: 'I60-I69', aliases: ['뇌혈관질환', '뇌출혈', '뇌경색'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정다빈도29대질병', category: '백내장', disease: '노년백내장', code: 'H25', aliases: ['백내장'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정다빈도29대질병', category: '백내장', disease: '기타 백내장', code: 'H26', aliases: ['백내장', '후발백내장'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정다빈도29대질병', category: '백내장', disease: '수정체의 기타 장애', code: 'H27', aliases: ['수정체', '백내장'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정다빈도29대질병', category: '수면무호흡', disease: '수면무호흡', code: 'G47.3', aliases: ['수면무호흡', '수면무호흡증'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정다빈도29대질병', category: '식도정맥류', disease: '식도정맥류', code: 'I85', aliases: ['식도정맥류'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정다빈도29대질병', category: '치열 및 치루', disease: '항문 및 직장부위 열창 및 누공', code: 'K60', aliases: ['치열', '치루'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정다빈도29대질병', category: '치열 및 치루', disease: '항문 및 직장부위 농양', code: 'K61', aliases: ['치열', '치루', '항문농양'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정31대질병', category: '당뇨병질환', disease: '1형 당뇨병', code: 'E10', aliases: ['당뇨', '당뇨병'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정31대질병', category: '당뇨병질환', disease: '2형 당뇨병', code: 'E11', aliases: ['당뇨', '당뇨병'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정31대질병', category: '녹내장', disease: '녹내장', code: 'H40', aliases: ['녹내장'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '특정31대질병', category: '췌장질환', disease: '췌장질환', code: 'K85-K87', aliases: ['췌장', '췌장질환'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '다빈도64대질병', category: '담낭/담도질환', disease: '담석증 및 담낭·담도 질환', code: 'K80-K83', aliases: ['담석', '담낭', '담도'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '다빈도64대질병', category: '신장결석', disease: '비뇨계통 결석 및 신장 관련 질환', code: 'N20-N21', aliases: ['신장결석', '요관결석', '요로결석'] },
  { company: '메리츠화재', productName: '131대질병수술비', groupName: '다빈도64대질병', category: '양성신생물', disease: '갑상선 및 내분비선의 양성 신생물', code: 'D34-D35', aliases: ['갑상선양성종양', '내분비선양성종양'] },
  { company: 'DB손해보험', productName: '119대질병수술비', groupName: '5대질병', category: '위·십이지장궤양', disease: '위·십이지장궤양', code: 'K25-K27', aliases: ['위궤양', '십이지장궤양'] },
  { company: 'DB손해보험', productName: '119대질병수술비', groupName: '5대질병', category: '녹내장', disease: '녹내장', code: 'H40-H42', aliases: ['녹내장'] },
  { company: 'DB손해보험', productName: '119대질병수술비', groupName: '68대생활질환', category: '담낭·담도질환', disease: '담석증 및 담낭·담도질환', code: 'K80-K83', aliases: ['담석', '담낭', '담도'] },
  { company: 'DB손해보험', productName: '119대질병수술비', groupName: '68대생활질환', category: '백내장', disease: '백내장 및 수정체 장애', code: 'H25-H27', aliases: ['백내장', '수정체'] },
  { company: 'DB손해보험', productName: '119대질병수술비', groupName: '특정다빈도4대질병', category: '생식기질환', disease: '생식기질환', code: 'N40-N95', aliases: ['생식기질환', '전립선질환', '자궁질환', '난소질환'] },
  { company: '흥국화재', productName: '신70대 특정질병수술비', groupName: '가1 생활/소화기', category: '백내장', disease: '백내장 및 수정체 장애', code: 'H25-H27', aliases: ['백내장', '수정체'] },
  { company: '흥국화재', productName: '신70대 특정질병수술비', groupName: '가1 생활/소화기', category: '관절염', disease: '감염성·염증성·기타 관절염', code: 'M00-M25', aliases: ['관절염'] },
  { company: '흥국화재', productName: '신70대 특정질병수술비', groupName: '가1 생활/소화기', category: '담낭담도질환', disease: '담낭염 및 담도질환', code: 'K81-K83', aliases: ['담낭', '담도', '담낭염'] },
  { company: '흥국화재', productName: '신70대 특정질병수술비', groupName: '다1 주요질환', category: '심장질환', disease: '급성 류마티스열부터 기타 심장병', code: 'I00-I52', aliases: ['심장질환', '심근경색', '협심증'] },
  { company: '흥국화재', productName: '신70대 특정질병수술비', groupName: '다1 주요질환', category: '뇌혈관질환', disease: '뇌혈관질환', code: 'I60-I69', aliases: ['뇌혈관질환', '뇌출혈', '뇌경색'] },
  { company: '흥국화재', productName: '신70대 특정질병수술비', groupName: '다3 당뇨/고혈압', category: '당뇨병질환', disease: '당뇨병 및 합병증', code: 'E10-E14', aliases: ['당뇨', '당뇨병'] },
  { company: '흥국화재', productName: '신70대 특정질병수술비', groupName: '다3 당뇨/고혈압', category: '고혈압질환', disease: '고혈압질환', code: 'I10-I15', aliases: ['고혈압'] },
  { company: '흥국화재', productName: '신70대 특정질병수술비', groupName: '라4 여성/갑상선', category: '유방의 양성신생물', disease: '유방의 양성 신생물', code: 'D24', aliases: ['유방양성종양', '유방양성신생물'] },
  { company: '흥국화재', productName: '신70대 특정질병수술비', groupName: '라4 여성/갑상선', category: '유방의 장애', disease: '유방의 장애', code: 'N60-N64', aliases: ['유방장애'] },
  { company: '농협손해보험', productName: '144대질병수술비', groupName: '27대질병', category: '결핵', disease: '결핵 및 결핵의 후유증', code: 'A15-A19', aliases: ['결핵'] },
  { company: '농협손해보험', productName: '144대질병수술비', groupName: '27대질병', category: '폐렴', disease: '연쇄알균폐렴증 및 기타 폐렴증', code: 'A40-A41', aliases: ['폐렴', '패혈증'] },
  { company: '농협손해보험', productName: '144대질병수술비', groupName: '27대질병', category: '심장질환', disease: '심장질환', code: 'I00-I52', aliases: ['심장질환', '협심증', '심근경색'] },
  { company: '농협손해보험', productName: '144대질병수술비', groupName: '11대질병', category: '당뇨병질환', disease: '당뇨병 및 합병증', code: 'E10-E14', aliases: ['당뇨', '당뇨병'] },
  { company: '농협손해보험', productName: '144대질병수술비', groupName: '11대질병', category: '고혈압질환', disease: '고혈압질환', code: 'I10-I15', aliases: ['고혈압'] },
  { company: '농협손해보험', productName: '144대질병수술비', groupName: '59대생활질환', category: '유방의 장애', disease: '유방의 장애', code: 'N60-N64', aliases: ['유방장애'] },
  { company: '농협손해보험', productName: '144대질병수술비', groupName: '59대생활질환', category: '식도질환', disease: '식도질환', code: 'K20-K23', aliases: ['식도질환', '식도염'] },
  { company: '농협손해보험', productName: '144대질병수술비', groupName: '43대생활질환', category: '백내장', disease: '백내장 및 수정체 장애', code: 'H25-H27', aliases: ['백내장', '수정체'] },
  { company: '농협손해보험', productName: '144대질병수술비', groupName: '43대생활질환', category: '담낭담도질환', disease: '담낭·담도질환', code: 'K81-K83', aliases: ['담낭', '담도', '담낭염'] },
  { company: '농협손해보험', productName: '144대질병수술비', groupName: '다빈도4대질병', category: '치핵', disease: '치핵 및 항문주위 정맥혈전증', code: 'K64', aliases: ['치핵', '치질'] },
  { company: '하나손해보험', productName: '136대질병수술비', groupName: '17대질병', category: '심장질환', disease: '심장질환', code: 'I00-I52', aliases: ['심장질환', '협심증', '심근경색'] },
  { company: '하나손해보험', productName: '136대질병수술비', groupName: '17대질병', category: '고혈압질환', disease: '고혈압질환', code: 'I10-I15', aliases: ['고혈압'] },
  { company: '하나손해보험', productName: '136대질병수술비', groupName: '14대질병Ⅱ', category: '위·십이지장궤양', disease: '위·십이지장궤양', code: 'K25-K27', aliases: ['위궤양', '십이지장궤양'] },
  { company: '하나손해보험', productName: '136대질병수술비', groupName: '26대질병', category: '담낭담도질환', disease: '담낭·담도질환', code: 'K81-K83', aliases: ['담낭', '담도', '담낭염'] },
  { company: '하나손해보험', productName: '136대질병수술비', groupName: '40대질병', category: '백내장', disease: '백내장 및 수정체 장애', code: 'H25-H27', aliases: ['백내장', '수정체'] },
  { company: '하나손해보험', productName: '136대질병수술비', groupName: '38대질병', category: '생식기질환', disease: '생식기질환', code: 'N40-N99', aliases: ['생식기질환', '전립선질환', '자궁질환', '난소질환'] },
  { company: '하나손해보험', productName: '136대질병수술비', groupName: '치핵수술비', category: '치핵', disease: '치핵 및 항문주위 정맥혈전증', code: 'K64', aliases: ['치핵', '치질'] },
  { company: '롯데손해보험', productName: '142대 수술비', groupName: '18대 특정질병', category: '당뇨병질환', disease: '당뇨병 및 합병증', code: 'E10-E14', aliases: ['당뇨', '당뇨병'] },
  { company: '롯데손해보험', productName: '142대 수술비', groupName: '18대 특정질병', category: '심장질환', disease: '심장질환', code: 'I00-I52', aliases: ['심장질환', '협심증', '심근경색'] },
  { company: '롯데손해보험', productName: '142대 수술비', groupName: '4대 특정질병', category: '백내장', disease: '백내장 및 수정체 장애', code: 'H25-H27', aliases: ['백내장', '수정체'] },
  { company: '롯데손해보험', productName: '142대 수술비', groupName: '39대 특정질병', category: '담낭담도질환', disease: '담낭·담도질환', code: 'K81-K83', aliases: ['담낭', '담도', '담낭염'] },
  { company: '롯데손해보험', productName: '142대 수술비', groupName: '갑상선질환', category: '갑상선질환', disease: '갑상선질환', code: 'E00-E07', aliases: ['갑상선'] },
  { company: '롯데손해보험', productName: '142대 수술비', groupName: '2대질환', category: '치핵·치열·치루', disease: '치핵·치열·치루', code: 'K60-K64', aliases: ['치핵', '치열', '치루'] },
  { company: '롯데손해보험', productName: '142대 수술비', groupName: '2대질병', category: '뇌혈관질환', disease: '뇌혈관질환', code: 'I60-I69', aliases: ['뇌혈관질환', '뇌출혈', '뇌경색'] },
  { company: '한화생명', productName: '70대특정질병수술비', groupName: '하부호흡기/폐질환', category: '폐질환', disease: '폐기종·기관지확장증·흉막질환', code: 'J43-J47', aliases: ['폐기종', '기관지확장증', '폐질환', '흉막질환'] },
  { company: '한화생명', productName: '70대특정질병수술비', groupName: '소화기/담낭담도질환', category: '담낭담도질환', disease: '담낭염 및 담도질환', code: 'K81-K83', aliases: ['담낭', '담도', '담낭염'] },
  { company: '한화생명', productName: '70대특정질병수술비', groupName: '갑상선/내분비질환', category: '갑상선질환', disease: '갑상선질환', code: 'E00-E07', aliases: ['갑상선'] },
  { company: '한화생명', productName: '70대특정질병수술비', groupName: '비뇨/신장질환', category: '신장 및 요관 결석', disease: '신장 및 요관의 결석', code: 'N20', aliases: ['신장결석', '요관결석', '요로결석'] },
  { company: '한화생명', productName: '70대특정질병수술비', groupName: '눈/귀/신경질환', category: '안면신경장애', disease: '안면신경장애', code: 'G50-G52', aliases: ['안면신경', '삼차신경'] },
  { company: '한화생명', productName: '70대특정질병수술비', groupName: '근골격/연조직질환', category: '추간판장애', disease: '추간판장애', code: 'M50-M51', aliases: ['추간판', '디스크', '목디스크', '허리디스크'] },
  { company: '삼성생명', productName: '다모은 153대 질병수술보장특약', groupName: '5대 주요기관 질병', category: '뇌혈관질환', disease: '뇌혈관질환', code: 'I60-I69', aliases: ['뇌혈관질환', '뇌출혈', '뇌경색'] },
  { company: '삼성생명', productName: '다모은 153대 질병수술보장특약', groupName: '5대 주요기관 질병', category: '급성심근경색', disease: '급성심근경색', code: 'I21', aliases: ['심근경색', '급성심근경색'] },
  { company: '삼성생명', productName: '다모은 153대 질병수술보장특약', groupName: '5대 주요기관 질병', category: '췌장질환', disease: '췌장질환', code: 'K85-K86', aliases: ['췌장', '췌장질환'] },
  { company: '삼성생명', productName: '다모은 153대 질병수술보장특약', groupName: '15대 특정질병', category: '녹내장', disease: '녹내장', code: 'H40-H42', aliases: ['녹내장'] },
  { company: '삼성생명', productName: '다모은 153대 질병수술보장특약', groupName: '25대 특정질병', category: '마비', disease: '마비증후군', code: 'G81-G83', aliases: ['마비', '편마비', '사지마비'] },
  { company: '삼성생명', productName: '다모은 153대 질병수술보장특약', groupName: '19대 특정질병', category: '전립선질환', disease: '전립선질환', code: 'N40-N42', aliases: ['전립선'] },
  { company: '삼성생명', productName: '다모은 153대 질병수술보장특약', groupName: '20대 후경디빈도 질병', category: '수면무호흡증', disease: '수면무호흡증', code: 'G47.3', aliases: ['수면무호흡', '수면무호흡증'] },
]

const commonMajorKeywords = [
  '뇌혈관', '심장', '간질환', '폐질환', '췌장', '신부전', '폐렴', '결핵',
  '대동맥', '동맥경화', '버거씨병', '파킨슨', '조로증', '크로이츠펠트',
]

const commonDigestiveKeywords = [
  '위궤양', '위암', '십이지장', '담낭', '담도', '췌장', '충수', '탈장', '복막',
  '식도', '치핵', '치루', '항문', '사타구니탈장',
]

const commonEyeEarKeywords = [
  '백내장', '녹내장', '망막', '안구', '안와', '유리체', '중이', '내이', '고막',
]

const commonEndocrineUrinaryKeywords = [
  '갑상선', '부갑상선', '부신', '신장', '방광', '요관', '전립선', '난소', '자궁',
  '생식기', '요도', '고환',
]

const commonSpineJointKeywords = [
  '관절', '척추', '추간판', '디스크', '골다공증', '골수염', '근육', '인대', '연골',
]

export const N_SURGERY_COVERAGES: NSurgeryCoverage[] = [
  {
    company: '흥국생명',
    productName: '무배당 130대질병수술특약',
    groupName: '2대질병',
    keywords: ['뇌혈관질환', '허혈성심장질환', '급성심근경색', '협심증', '심장'],
    diseaseCodes: ['I20-I25', 'I60-I69'],
    note: '이미지 약관 기준. 2대질병, 특정29대질병, 다빈도64대질병 등으로 구성됩니다.',
  },
  {
    company: '흥국생명',
    productName: '무배당 130대질병수술특약',
    groupName: '다빈도64대질병',
    keywords: [
      '백내장', '녹내장', '담석', '담낭', '담도', '충수', '탈장', '치핵', '치루',
      '갑상선', '부갑상선', '부신', '신장', '방광', '요관', '자궁', '난소',
      '중이', '내이', '안면신경', '단일신경병증',
    ],
    diseaseCodes: ['D11-D35', 'D59.3', 'D73', 'E00-E07', 'E20-E27', 'E89.0', 'G50-G59', 'H05', 'H10-H13', 'H25-H27', 'H40-H43', 'H60-H95', 'I80-I89', 'J00-J39', 'K11-K64', 'K80-K90', 'M00-M25', 'M30-M94', 'N00-N99', 'R61'],
  },
  {
    company: '흥국생명',
    productName: '무배당 130대질병수술특약',
    groupName: '특정29대질병',
    keywords: [
      '간질환', '위궤양', '십이지장궤양', '결핵', '패혈증', '파킨슨',
      '뇌전증', '수두증', '대동맥', '췌장질환', '크론병', '궤양성대장염',
    ],
    diseaseCodes: ['A15-A19', 'A40-A41', 'A81.0', 'A83-A86', 'B15-B19', 'E34.8', 'G00-G09', 'G20-G21', 'G35', 'G40-G41', 'G70-G91', 'H35.0', 'I10-I15', 'I70-I72', 'J12-J18', 'J40-J47', 'J60-J94', 'K25-K27', 'K50-K52', 'K85-K87', 'N17-N19'],
  },
  {
    company: 'DB손해보험',
    productName: '119대질병수술비',
    groupName: '20대질병',
    keywords: ['심장질환', '뇌혈관질환', '간질환', '동맥경화증', '만성하부호흡기질환', '폐렴', '결핵', '신부전', '패혈증', '중추신경계 염증성질환', '파킨슨병', '다발경화증', '자율신경계통장애', '대동맥류', '폐질환', '급성췌장염', '췌장질환', '크로이츠펠트-야콥병', '조로증'],
    diseaseCodes: ['I00-I52', 'I60-I69', 'B15-B19', 'K70-K77', 'I70-I72', 'J40-J47', 'A15-A19', 'N17-N19', 'A40-A41', 'G00-G09', 'G20-G21', 'G35', 'G90', 'K85-K87', 'A81.0', 'E34.8'],
    baseAmount: 2000,
  },
  {
    company: 'DB손해보험',
    productName: '119대질병수술비',
    groupName: '5대질병',
    keywords: ['위·십이지장궤양', '녹내장', '뇌전증', '버거씨병', '위공장궤양'],
    diseaseCodes: ['K25-K27', 'H40-H42', 'G40-G41', 'I73.1', 'K28'],
    baseAmount: 1000,
  },
  {
    company: 'DB손해보험',
    productName: '119대질병수술비',
    groupName: '68대생활질환',
    keywords: ['담석증', '사타구니탈장', '편도염', '축농증', '소화계통 양성신생물', '중이·호흡계통 양성신생물', '골·관절연골 양성신생물', '조직의 양성신생물', '수막 양성신생물', '갑상선 및 내분비선 양성신생물', '비뇨기관 양성신생물', '생식기 양성신생물', '유방의 양성신생물', '백내장', '손목터널증후군', '어깨병변', '골다공증', '황반변성', '급성상기도감염', '담낭담도질환', '안면신경장애', '척추병증', '추간판장애', '식도질환', '위십이지장질환', '장질환', '요로결석', '전립선질환', '부갑상선기능질환', '뇌하수체기능질환', '장흡수장애', '비장질환'],
    diseaseCodes: ['K80-K83', 'K40-K46', 'J35-J39', 'J32', 'D13-D35', 'H25-H27', 'G56.0', 'M75', 'M80-M84', 'H35.3', 'J00-J06', 'G50-G52', 'M40-M51', 'K20-K31', 'K55-K57', 'N20-N39', 'N40-N51', 'E20-E27', 'D73', 'K90'],
    baseAmount: 100,
  },
  {
    company: 'DB손해보험',
    productName: '119대질병수술비',
    groupName: '특정다빈도4대질병',
    keywords: ['관절염', '백내장', '결막장애', '생식기질환'],
    diseaseCodes: ['M00-M25', 'H25-H27', 'H10-H13', 'N40-N95'],
    baseAmount: 100,
  },
  {
    company: 'DB손해보험',
    productName: '119대질병수술비',
    groupName: '22대질병',
    keywords: ['치핵', '치열치루', '중증근무력증', '전신결합조직장애', '안와장애', '유리체장애', '골수염', '골괴사증', '뼈의파젯병', '요로결석', '방광결석', '다낭성난소증후군', '대상포진', '식도정맥류', '안구장애', '음낭정맥류'],
    diseaseCodes: ['K64', 'K60-K61', 'G70', 'M30-M36', 'H05', 'H43', 'M86-M88', 'N20-N21', 'N83.8', 'B02', 'I85', 'H44', 'I86.1'],
    baseAmount: 100,
  },
  {
    company: 'KB손해보험',
    productName: '112대질병수술비',
    groupName: '112대 I',
    keywords: ['심장', '뇌혈관', '고혈압', '폐렴', '간질환', '동맥경화', '신부전', '대동맥', '간암', '폐암', '췌장암'],
    baseAmount: 2000,
  },
  {
    company: 'KB손해보험',
    productName: '112대질병수술비',
    groupName: '112대 III/IV',
    keywords: [...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords, ...commonSpineJointKeywords],
    baseAmount: 200,
  },
  {
    company: '메리츠화재',
    productName: '131대질병수술비',
    groupName: '심장질환/뇌혈관질환',
    keywords: ['심장질환', '류마티스열', '허혈성심질환', '심근경색', '협심증', '심장병', '뇌혈관질환', '뇌출혈', '뇌경색'],
    diseaseCodes: ['I00-I02', 'I05-I09', 'I20-I25', 'I26-I28', 'I30-I52', 'I60-I69'],
  },
  {
    company: '메리츠화재',
    productName: '131대질병수술비',
    groupName: '특정다빈도29대질병',
    keywords: ['혀질환', '유방양성신생물', '다낭성난소증후군', '수면무호흡', '안와장애', '결막장애', '식도정맥류', '음낭정맥류', '백내장', '다한증', '관절염', '치핵', '치루'],
    diseaseCodes: ['K14', 'D24', 'E28.2', 'G47.3', 'G55.0-G55.3', 'H05', 'H10-H13', 'I80', 'I82', 'I85', 'I86.1', 'J20-J21', 'K31', 'K58-K59', 'K60-K61', 'M49', 'M53-M54', 'M70-M79', 'M86-M88', 'M91-M94', 'N23', 'R61', 'H25-H27', 'M00-M25', 'N40-N99', 'K64'],
  },
  {
    company: '메리츠화재',
    productName: '131대질병수술비',
    groupName: '특정31대질병',
    keywords: ['간질환', '고혈압', '당뇨', '만성하부호흡기질환', '위궤양', '십이지장궤양', '결핵', '패혈증', '파킨슨병', '뇌전증', '마비', '녹내장', '대동맥류', '폐렴', '폐질환', '폐부종', '췌장질환', '신부전'],
    diseaseCodes: ['A81.0', 'B15-B19', 'K70-K77', 'I10-I15', 'H35.0', 'E10-E14', 'G59.0', 'G63.2', 'H28.0', 'H36.0', 'M14.2', 'N08.3', 'E34.8', 'J40-J46', 'K25-K27', 'A15-A19', 'B90', 'K67.3', 'K93.0', 'M01.1', 'M49.0', 'M90.0', 'N33.0', 'N74.0-N74.1', 'A40-A41', 'G00-G09', 'G20-G21', 'G35', 'G40-G41', 'G70', 'G80-G83', 'G90-G91', 'H40-H42', 'I70-I72', 'J12-J18', 'A48.1', 'J43-J47', 'J60-J70', 'J81-J86', 'J90-J94', 'K85-K87', 'N17-N19'],
  },
  {
    company: '메리츠화재',
    productName: '131대질병수술비',
    groupName: '다빈도64대질병',
    keywords: ['양성신생물', '갑상선질환', '부갑상선질환', '뇌하수체질환', '혈관질환', '상기도질환', '중이질환', '내이질환', '시각질환', '사구체질환', '비뇨계통질환', '유방장애', '식도질환', '담낭질환', '골다공증', '신경질환'],
    diseaseCodes: ['D11', 'D13-D16', 'D19-D35', 'D59.3', 'D73', 'E00-E07', 'H06.2', 'E20-E27', 'E89.0', 'I73.1', 'I74', 'I77', 'I81', 'I88-I89', 'I98.2-I98.3', 'J00-J11', 'J22', 'J32', 'J35-J39', 'J80', 'H15-H22', 'H30-H33', 'H35.3', 'H46-H48', 'H59.8', 'H60-H75', 'H80-H95', 'N00-N15', 'N20-N21', 'N25-N39', 'N60-N64', 'K11', 'K20-K23', 'K29-K30', 'K40-K46', 'K50-K57', 'K80-K83', 'K90', 'M30-M35', 'M40-M48', 'M50-M51', 'M80-M84', 'G50-G59'],
  },
  {
    company: '삼성화재',
    productName: '111대질병수술비 + 4대특정수술비',
    groupName: '5대질병',
    keywords: ['뇌질환', '심질환', '간질환', '폐질환', '췌장질환'],
    diseaseCodes: ['I60-I69', 'I00-I52', 'B15-B19', 'K70-K77', 'J40-J47', 'K85-K87'],
    baseAmount: 100,
  },
  {
    company: '삼성화재',
    productName: '111대질병수술비 + 4대특정수술비',
    groupName: '22대질병',
    keywords: ['위궤양', '십이지장궤양', '결핵', '신부전', '녹내장', '동맥경화', '만성기관지염', '폐렴', '바이러스간염', '패혈증', '수두증', '파킨슨병', '뇌전증', '뇌성마비'],
    diseaseCodes: ['K25-K27', 'A15-A19', 'N17-N19', 'H40-H42', 'I70', 'J40-J42', 'J12-J18', 'B15-B19', 'A40-A41', 'G91', 'G20-G21', 'G40-G41', 'G80'],
    baseAmount: 100,
  },
  {
    company: '삼성화재',
    productName: '111대질병수술비 + 4대특정수술비',
    groupName: '3대질병',
    keywords: ['갑상선질환', '당뇨병질환', '고혈압질환'],
    diseaseCodes: ['E00-E07', 'E10-E14', 'I10-I15'],
    baseAmount: 100,
  },
  {
    company: '삼성화재',
    productName: '111대질병수술비 + 4대특정수술비',
    groupName: '62대질병',
    keywords: [...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords, ...commonSpineJointKeywords, '사구체질환', '세뇨관질환', '치핵', '백내장', '유방장애'],
    diseaseCodes: ['N00-N15', 'N20-N39', 'H25-H27', 'K64', 'D11-D35', 'K20-K90', 'M30-M94'],
    baseAmount: 100,
  },
  {
    company: '흥국화재',
    productName: '신70대 특정질병수술비',
    groupName: '가1 생활/기초질환',
    keywords: ['백내장', '관절염', '생식기질환', '급성상기도감염', '담낭담도질환'],
    diseaseCodes: ['H25-H27', 'M00-M25', 'N40-N99', 'J00-J06', 'K81-K83'],
    baseAmount: 50,
  },
  {
    company: '흥국화재',
    productName: '신70대 특정질병수술비',
    groupName: '가2~나5 양성종양/생활질환',
    keywords: ['중이진주종', '귀경화증', '소화계 양성신생물', '흉곽내기관 양성신생물', '골관절연골 양성신생물', '조직 양성신생물', '수막 양성신생물', '뇌 및 중추신경계 양성신생물', '갑상선내분비 양성신생물', '골다공증', '담석증', '사타구니탈장', '편도염', '축농증', '식도질환', '위십이지장질환', '내이질환', '단일신경병증', '방광결석', '비감염성장염결장염', '중이유돌질환', '척추변형', '척추병증', '비뇨계통질환', '신장요관질환', '안면신경장애', '인후부위질환', '사구체질환', '신세뇨관간질질환', '특정부위탈장', '특정장질환'],
    diseaseCodes: ['H71', 'H80', 'D13-D35', 'M80-M84', 'K80', 'K40-K46', 'J35-J39', 'K20-K31', 'H81-H83', 'G56-G59', 'N21.0', 'K50-K52', 'H65-H75', 'M40-M47', 'N25-N39', 'N20-N29', 'G50-G52', 'J36-J39', 'N00-N16', 'K41-K57'],
    baseAmount: 50,
  },
  {
    company: '흥국화재',
    productName: '신70대 특정질병수술비',
    groupName: '다1~다4 중증/만성질환',
    keywords: ['심장질환', '뇌혈관질환', '간질환', '위십이지장궤양', '동맥경화증', '만성하부호흡기질환', '폐렴', '녹내장', '황반변성', '결핵', '신부전', '급성췌장염', '다발경화증', '대동맥류', '자율신경계통장애', '중추신경계 염증성질환', '췌장질환', '파킨슨병', '패혈증', '폐질환', '당뇨병질환', '고혈압질환'],
    diseaseCodes: ['I00-I52', 'I60-I69', 'B15-B19', 'K70-K77', 'K25-K27', 'I70', 'J40-J47', 'J12-J18', 'H40-H42', 'H35.3', 'A15-A19', 'N17-N19', 'K85-K87', 'G35', 'I71', 'G90', 'G00-G09', 'G20-G21', 'A40-A41', 'J43-J47', 'E10-E14', 'I10-I15'],
    baseAmount: 50,
  },
  {
    company: '흥국화재',
    productName: '신70대 특정질병수술비',
    groupName: '라1~라4 여성/근골격/갑상선',
    keywords: ['생식기 양성종양', '특정 누적외상성질환', '근육장애', '어깨병변', '윤활막힘줄장애', '눈 및 부속기 특정질환', '유방의 장애', '유방의 양성신생물', '후각특정질환', '갑상선질환'],
    diseaseCodes: ['D25-D29', 'M35', 'M53.1', 'M70-M79', 'M60-M68', 'M75', 'H15-H19', 'H20-H22', 'H30-H36', 'H46-H48', 'H59.8', 'N60-N64', 'D24', 'J30-J34', 'E00-E07', 'H06.2', 'E89.0'],
    baseAmount: 50,
  },
  {
    company: '삼성생명',
    productName: '다모은 153대 질병수술보장특약',
    groupName: '5대 주요기관 질병',
    keywords: ['뇌혈관질환', '급성심근경색', '특정감염성간질환', '췌장질환', '위십이지장질환', '궤양'],
    diseaseCodes: ['I60-I69', 'I21', 'B18', 'K85-K86', 'K76-K77', 'K25-K27'],
    baseAmount: 1500,
    note: '이미지 기준: 각각 1,500만원, 세분화 항목은 500만원 기준',
  },
  {
    company: '삼성생명',
    productName: '다모은 153대 질병수술보장특약',
    groupName: '17대 특정질병',
    keywords: ['악성신생물', '파킨슨병', '뇌염', '척수염', '폐렴', '특정호흡기질환', '뇌하수체기능장애', '특정요붕증', '특정요리기능증'],
    diseaseCodes: ['C00-C97', 'D00-D09', 'G20-G21', 'G04-G09', 'J12-J18', 'J82-J84', 'E23', 'D70', 'J28', 'Z51'],
    baseAmount: 250,
  },
  {
    company: '삼성생명',
    productName: '다모은 153대 질병수술보장특약',
    groupName: '15대 특정질병',
    keywords: ['위궤양', '십이지장궤양', '척추염', '녹내장', '만성기관지염', '폐렴', '흉막질환', '부갑상선기능장애', '루푸스', '반지성홍반', '위궤양증후군', '부신질환'],
    diseaseCodes: ['K25-K28', 'M17-M19', 'H40-H42', 'J40-J42', 'J12-J18', 'J90-J94', 'E20-E21', 'M20-M21', 'G90', 'M32', 'L93.1', 'E25'],
    baseAmount: 250,
  },
  {
    company: '삼성생명',
    productName: '다모은 153대 질병수술보장특약',
    groupName: '25대 특정질병',
    keywords: ['당뇨병성신증', '고혈압질환', '급성신질환', '만성신증후군', '다발경화증', '알츠하이머병', '마비', '혈액조혈기관질환', '동맥질환', '복합중증질환', '편두통증', '특정심장질환', '부정상상병', '난관폐색', '신경관선천이상', '상지관절구축', '대퇴골두괴사', '요천추추경', '원판증후', '경과사로', '급성골수염', '뼈의국재화', '연질병증'],
    diseaseCodes: ['N08.3', 'I10-I15', 'N00-N16', 'G35', 'G30', 'G81-G83', 'D50-D89', 'I70-I79', 'G43', 'I30-I52', 'M80-M84', 'M87'],
    baseAmount: 50,
  },
  {
    company: '삼성생명',
    productName: '다모은 153대 질병수술보장특약',
    groupName: '22대 특정질병',
    keywords: ['급성상기도감염', '독감', '급성기관지염', '급성세기관지염', '급성하기도감염', '인후두질환', '성대결절', '외부요인폐렴', '만성하지', '알레르기', '비뇨기계통기타질환', '아귀고환', '중이유돌질환', '눈및부속기질환', '귀의기타장애'],
    diseaseCodes: ['J00-J06', 'J09-J11', 'J20-J22', 'J36-J39', 'J38', 'J60-J70', 'N30-N39', 'H65-H75', 'H55-H59', 'H90-H95'],
    baseAmount: 15,
  },
  {
    company: '삼성생명',
    productName: '다모은 153대 질병수술보장특약',
    groupName: '19대 특정질병',
    keywords: ['흉함', '무호증', '안구및안와관광', '다발성내분비세포종양', '갑상선절제', '귀비인두질환', '초음파', '사타구니탈장', '탈장', '복막염', '전립선질환', '난소난관질환', '여성골반염증', '여성생식기질환', '다한증', '정자선천옥양증', '호흡기계통질환', '흉곽내기관', '골관절염증', '골성장', '기타내분비선'],
    diseaseCodes: ['D13-D35', 'E31', 'K40-K46', 'K65-K67', 'N40-N42', 'N70-N98', 'R61', 'J95-J99', 'M00-M25'],
    baseAmount: 10,
  },
  {
    company: '삼성생명',
    productName: '다모은 153대 질병수술보장특약',
    groupName: '20대 후경디빈도 질병',
    keywords: ['영외상세불명동행성경기양성신생물', '백내장', '화지및백내장', '눈물관질환', '비용종', '특정소화기관장애', '대뇌', '임신강경질환', '한명익', '눈물암', '버동동여', '수면무호흡증'],
    diseaseCodes: ['D10-D36', 'H25-H27', 'H04', 'J33', 'K90-K93', 'G47.3'],
    baseAmount: 10,
  },
  {
    company: '한화생명',
    productName: '70대특정질병수술비',
    groupName: '하부호흡기/폐질환',
    keywords: ['폐기종', '기관지확장증', '폐질환', '흉막질환', '하기도질환', '폐농양', '농흉', '외부요인 폐질환'],
    diseaseCodes: ['J43', 'J47', 'J68-J69', 'J85-J86', 'J90-J94'],
  },
  {
    company: '한화생명',
    productName: '70대특정질병수술비',
    groupName: '소화기/담낭담도질환',
    keywords: ['위궤양', '십이지장궤양', '소화성궤양', '위공장궤양', '탈장', '급성췌장염', '췌장질환', '크론병', '궤양성대장염', '특정장질환', '복막질환', '담낭염', '담도질환', '식도질환', '위십이지장질환'],
    diseaseCodes: ['K25.0-K27.2', 'K28', 'K40-K43', 'K50-K57', 'K65-K67', 'K81-K87', 'K20-K23', 'K29-K30'],
  },
  {
    company: '한화생명',
    productName: '70대특정질병수술비',
    groupName: '양성신생물/내분비질환',
    keywords: ['소화계 양성신생물', '호흡기 양성신생물', '골관절연골 양성신생물', '조직 양성신생물', '수막 양성신생물', '뇌중추신경계 양성신생물', '갑상선 양성신생물', '남성생식기 양성종양', '여성생식기 양성종양', '비뇨기관 양성신생물', '갑상선질환'],
    diseaseCodes: ['D13-D16', 'D19-D35', 'E00-E07', 'E89.0', 'H06.2'],
  },
  {
    company: '한화생명',
    productName: '70대특정질병수술비',
    groupName: '신장/비뇨/유방질환',
    keywords: ['사구체질환', '신세뇨관간질질환', '신장요관결석', '방광결석', '비뇨기계통질환', '유방의장애', '전립선질환', '남성생식기질환', '여성골반염증질환', '여성생식관 비염증성질환'],
    diseaseCodes: ['N00-N16', 'N20-N21', 'N25-N39', 'N40-N45', 'N60-N64', 'N70', 'N80-N98'],
  },
  {
    company: '한화생명',
    productName: '70대특정질병수술비',
    groupName: '눈/귀/신경질환',
    keywords: ['중이유돌질환', '내이질환', '황반변성', '공막각막홍채섬모체장애', '맥락막망막장애', '시신경시각경로장애', '안면신경장애', '손목터널증후군', '단일신경병증', '중증근무력증', '마비'],
    diseaseCodes: ['H15-H22', 'H30-H36', 'H46-H48', 'H65-H83', 'G50-G59', 'G70', 'G81-G83'],
  },
  {
    company: '한화생명',
    productName: '70대특정질병수술비',
    groupName: '혈관/근골격/연조직질환',
    keywords: ['비장질환', '동맥색전증', '중증근무력증', '마비', '전신결합조직장애', '누적외상성질환', '유리체장애', '림프절염', '통풍', '골수염', '골괴사', '뼈의파젯병', '연골병증', '추간판장애', '척추변형', '척추병증', '골다공증', '근육장애', '연조직장애'],
    diseaseCodes: ['D73', 'I74-I77', 'M10', 'M30-M35', 'M40-M51', 'M53.1', 'M60-M94', 'H43', 'I88-I89'],
  },
  {
    company: '현대해상',
    productName: 'N대 질병수술비',
    groupName: '회사별 이미지 자료 확인',
    keywords: [...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords],
    note: '로컬 폴더의 현대해상 이미지 7장 기준. 세부 그룹/한도는 원자료 대조 필요.',
  },
  {
    company: '한화손해보험',
    productName: '124대질병수술비',
    groupName: '특정10대질병',
    keywords: ['심장질환', '고혈압질환', '뇌혈관질환', '신부전', '패혈증', '파킨슨병', '뇌전증', '대동맥류', '중추신경계 탈수초질환'],
    diseaseCodes: ['I00-I52', 'I10-I15', 'I60-I69', 'N17-N19', 'A40-A41', 'G20-G21', 'G40-G41', 'I71-I72', 'G35'],
  },
  {
    company: '한화손해보험',
    productName: '124대질병수술비',
    groupName: '특정13대질병 A/B',
    keywords: ['결핵', '당뇨병질환', '수막염', '뇌 및 척수 염증질환', '폐렴', '만성하부호흡기질환', '간질환', '위십이지장궤양', '위공장궤양', '급성췌장염', '췌장질환', '비장질환', '중증근무력증'],
    diseaseCodes: ['A15-A19', 'B90', 'E10-E14', 'G00-G09', 'J12-J18', 'J40-J46', 'B15-B19', 'K70-K77', 'K25-K28', 'K85-K87', 'D73', 'G70'],
  },
  {
    company: '한화손해보험',
    productName: '124대질병수술비',
    groupName: '30대경증질병',
    keywords: ['소화기 양성신생물', '흉곽내기관 양성신생물', '골 및 관절연골 양성신생물', '조직의 양성신생물', '눈 및 부속기 양성신생물', '갑상선 양성신생물', '안면신경장애', '단일신경병증', '마비', '피부증', '관절염', '신장 및 요관 질환', '전립선질환', '남성생식기관질환', '유방의장애', '난소질환', '비뇨생식기 기타장애'],
    diseaseCodes: ['D13-D35', 'G50-G59', 'G81-G83', 'J81', 'M00-M25', 'N20-N39', 'N40-N51', 'N60-N64', 'N70-N95'],
  },
  {
    company: '한화손해보험',
    productName: '124대질병수술비',
    groupName: '50대경증질병',
    keywords: ['유방양성신생물', '맥락막망막장애', '유리체장애', '중이염', '내이질환', '림프절염', '급성상기도감염', '편도염', '식도질환', '위십이지장질환', '담석증', '담낭담도질환', '관절질환', '추간판장애', '어깨병변', '골다공증', '연골병증', '요로결석', '방광결석', '전립선질환', '여성골반내 염증성질환', '여성생식기관 비염증성장애'],
    diseaseCodes: ['D24', 'H30-H36', 'H60-H95', 'I88-I89', 'J00-J06', 'J35', 'K20-K31', 'K80-K83', 'M00-M94', 'N20-N39', 'N40-N95'],
  },
  {
    company: '한화손해보험',
    productName: '124대질병수술비',
    groupName: '7대생활질병/치핵',
    keywords: ['하지정맥류', '발바닥근막섬유종증', '어깨유착성관절낭염', '손목터널증후군', '안검하수', '수면무호흡증', '전신결합조직장애', '치핵'],
    diseaseCodes: ['I83', 'M72.2', 'M75.0', 'G56.0', 'H02.4', 'G47.3', 'M30-M36', 'K64'],
  },
  {
    company: '하나손해보험',
    productName: '136대질병수술비',
    groupName: '17대질병',
    keywords: ['크로이츠펠트-야콥병', '파킨슨병', '다발경화증', '뇌전증', '뇌성마비', '마비증후군', '자율신경계통장애', '수두증', '간질환', '심장질환', '고혈압질환', '뇌혈관질환', '대동맥류', '기타동맥류', '폐쇄성폐질환', '결절성다발동맥염', '신부전'],
    diseaseCodes: ['A81.0', 'G20-G21', 'G35', 'G40-G41', 'G80-G83', 'G90-G91', 'B15-B19', 'K70-K77', 'I00-I52', 'I10-I15', 'I60-I69', 'I71-I72', 'J43-J44', 'M30', 'N17-N19'],
  },
  {
    company: '하나손해보험',
    productName: '136대질병수술비',
    groupName: '14대질병Ⅱ',
    keywords: ['기관지확장증', '기타폐질환', '뇌하수체질환', '만성하부호흡기질환', '성인호흡곤란증후군', '외부요인 폐질환', '위공장궤양', '위궤양십이지장궤양', '중추신경계 염증성질환', '천식', '특정호흡기질환', '패혈증', '폐렴', '폐부종'],
    diseaseCodes: ['J47', 'J85-J94', 'E22-E23', 'J40-J46', 'J80', 'J60-J70', 'K28', 'K25-K27', 'G00-G09', 'J45-J46', 'J82-J84', 'A40-A41', 'J12-J18', 'J81'],
  },
  {
    company: '하나손해보험',
    productName: '136대질병수술비',
    groupName: '26대질병',
    keywords: ['결핵', '용혈요독증후군', '비장질환', '당뇨병질환', '부갑상선질환', '특정내분비선장애', '다낭성난소증후군', '안면신경장애', '기타뇌신경장애', '죽상경화증', '버거씨병', '동맥및세동맥질환', '문맥혈전증', '비감염성장염결장염', '특정장질환', '장의 특정기타질환', '담석증', '담낭담도질환', '급성췌장염', '췌장질환', '장흡수장애', '척추변형', '척추병증', '사구체질환', '신세뇨관간질질환', '신장요관질환'],
    diseaseCodes: ['A15-A19', 'D59.3', 'D73', 'E10-E14', 'E20-E21', 'E24-E27', 'E28.2', 'G50-G52', 'I70-I77', 'I81', 'K50-K57', 'K63.0-K63.3', 'K80-K87', 'K90', 'M40-M49', 'N00-N29'],
  },
  {
    company: '하나손해보험',
    productName: '136대질병수술비',
    groupName: '40대질병',
    keywords: ['골관절연골 양성신생물', '조직양성신생물', '유방양성신생물', '자궁양성신생물', '난소양성신생물', '남성생식기관양성신생물', '수막양성신생물', '갑상선내분비 양성신생물', '뇌중추신경 양성신생물', '갑상선질환', '단일신경병증', '눈 및 부속기 특정질환', '백내장', '황반변성', '녹내장', '유리체장애', '안구장애', '중이유돌질환', '내이질환', '정맥색전증혈전증', '하지정맥류', '식도정맥류', '인플루엔자', '급성하기도감염', '만성부비동염', '식도질환', '위십이지장질환', '충수질환', '사타구니탈장', '특정부위탈장', '복막질환', '특정소화계통질환', '관절염', '결합조직질환', '추간판장애', '근육장애', '골다공증', '골수염', '골괴사증', '비뇨계통기타질환', '유방의장애'],
    diseaseCodes: ['D16-D35', 'E00-E07', 'H06.2', 'E89.0', 'G56-G59', 'H15-H59.8', 'H25-H27', 'H35.3', 'H40-H44', 'H65-H95', 'I82-I85', 'I83', 'J09-J22', 'J32', 'K20-K57', 'K65-K67', 'K92', 'M00-M94', 'N30-N39', 'N60-N64'],
  },
  {
    company: '하나손해보험',
    productName: '136대질병수술비',
    groupName: '38대질병',
    keywords: ['대상포진', '주침샘양성신생물', '소화기계양성신생물', '중이호흡계통 양성신생물', '흉곽내기관 양성신생물', '비뇨기관 양성신생물', '눈 및 부속기 양성신생물', '수면무호흡증', '중증근무력증', '안와장애', '결막장애', '미만성중병성각막염', '외이질환', '정맥염혈전정맥염', '음낭정맥류', '림프절염', '급성상기도감염', '후각특정질환', '편도아데노이드만성질환', '인후부위특정질환', '침샘질환', '혀질환', '기능성소화불량', '기타과산성혈증', '전신홍반루푸스', '피부다발근염', '전신경화증', '기타연조직장애', '뼈의 파젯병', '뼈의 기타장애', '연골병증', '하부요로결석', '상세불명신장급통증', '특정요도질환', '생식기질환', '다한증'],
    diseaseCodes: ['B02', 'D11-D35', 'G47.3', 'G70', 'H05', 'H10-H13', 'H60-H95', 'I80-I89', 'J00-J39', 'K11-K14', 'K30', 'M31-M36', 'M49', 'M53-M79', 'M88-M94', 'N21-N39', 'N40-N99', 'R61'],
  },
  {
    company: '하나손해보험',
    productName: '136대질병수술비',
    groupName: '치핵수술비',
    keywords: ['치핵', '치질'],
    diseaseCodes: ['K64'],
  },
  {
    company: '농협손해보험',
    productName: '144대질병수술비',
    groupName: '27대질병',
    keywords: ['결핵', '폐렴', '크로이츠펠트-야콥병', '간질환', '조로증', '중추신경계 염증성질환', '파킨슨병', '중추신경계 탈수초질환', '뇌전증', '뇌성마비', '자율신경계통장애', '수두증', '녹내장', '심장질환', '뇌혈관질환', '동맥경화증', '대동맥류', '버거씨병', '만성하부호흡기질환', '폐질환', '위십이지장궤양', '급성췌장염', '췌장질환', '신부전'],
    diseaseCodes: ['A15-A19', 'A40-A41', 'A81.0', 'B15-B19', 'K70-K77', 'E34.8', 'G00-G09', 'G20-G21', 'G35-G37', 'G40-G41', 'G80', 'G90-G91', 'H40-H42', 'I00-I52', 'I60-I69', 'I70-I73.1', 'J40-J47', 'J85-J94', 'K25-K27', 'K85-K87', 'N17-N19'],
  },
  {
    company: '농협손해보험',
    productName: '144대질병수술비',
    groupName: '11대질병',
    keywords: ['당뇨병질환', '뇌하수체질환', '황반변성', '고혈압질환', '동맥 및 세동맥질환', '식도정맥류', '외부요인 폐질환', '피부증', '특정호흡기질환', '위공장궤양', '충수질환'],
    diseaseCodes: ['E10-E14', 'E22-E23', 'H35.3', 'I10-I15', 'I74', 'I77', 'I85', 'J60-J70', 'J81-J84', 'K28', 'K35-K38'],
  },
  {
    company: '농협손해보험',
    productName: '144대질병수술비',
    groupName: '59대생활질환',
    keywords: ['용혈요독증후군', '비장질환', '부갑상선질환', '대사장애', '수면무호흡증', '중증근무력증', '마비', '결막장애', '공막각막홍채섬모체장애', '유리체장애', '안구장애', '시신경시각경로장애', '안면신경장애', '시각장애', '외이질환', '중이염', '중이유돌질환', '내이질환', '귀장애', '정맥류', '림프절염', '인플루엔자', '급성하기도감염', '인후질환', '성대결절', '성인호흡곤란증후군', '호흡계통기타질환', '침샘질환', '식도질환', '위십이지장질환', '특정소화기질환', '탈장', '비감염성장염결장염', '특정장질환', '장특이질환', '복막질환', '장흡수장애', '통풍', '전신결합조직장애', '근육장애', '발바닥근막섬유종증', '골다공증', '골수염', '골괴사증', '뼈의파젯병', '연골병증', '사구체질환', '신세뇨관간질질환', '신장요관질환', '비뇨계통질환', '특정요도질환'],
    diseaseCodes: ['D59.3', 'D73', 'E20-E21', 'E24-E27', 'G47.3', 'G70', 'G81-G83', 'H10-H13', 'H15-H22', 'H43-H59.8', 'H60-H95', 'I80-I89', 'J09-J39', 'J80', 'J95-J99', 'K11', 'K20-K31', 'K41-K57', 'K63.0-K63.3', 'K65-K67', 'K90', 'M10', 'M30-M36', 'M60-M63', 'M72.2', 'M80-M94', 'N00-N16', 'N25-N39', 'N34-N36'],
  },
  {
    company: '농협손해보험',
    productName: '144대질병수술비',
    groupName: '43대생활질환',
    keywords: ['대상포진', '갑상선질환', '다낭성난소증후군', '안면신경장애', '단일신경병증', '손목터널증후군', '맥락막망막장애', '하지정맥류', '급성상기도감염', '후각특정질환', '축농증', '편도염', '사타구니탈장', '치열치루', '담석증', '담낭담도질환', '특정누적외상성질환', '척추변형', '척추병증', '추간판장애', '기타등병증', '윤활막힘줄장애', '어깨병변', '신장요관결석', '방광결석', '요도결석증', '유방의장애', '유방양성신생물', '주침샘양성신생물', '소화계양성신생물', '중이호흡계양성신생물', '골관절연골양성신생물', '조직양성신생물', '생식기양성신생물', '비뇨기관양성신생물', '눈부속기양성신생물', '수막양성신생물', '뇌중추신경양성신생물', '갑상선내분비양성신생물'],
    diseaseCodes: ['B02', 'E00-E07', 'E28.2', 'G50-G59', 'H01-H36', 'I83', 'J00-J06', 'J30-J35', 'K40-K46', 'K60-K64', 'K80-K83', 'M35', 'M40-M79', 'M80-M84', 'N20-N22', 'N60-N64', 'D11-D35'],
  },
  {
    company: '농협손해보험',
    productName: '144대질병수술비',
    groupName: '다빈도4대질병',
    keywords: ['관절염', '백내장', '생식기질환', '치핵'],
    diseaseCodes: ['M00-M25', 'H25-H27', 'N40-N99', 'K64'],
  },
  {
    company: '롯데손해보험',
    productName: '142대 수술비',
    groupName: '18대 특정질병',
    keywords: ['당뇨병질환', '고혈압', '간질환', '위십이지장질환', '동맥경화증', '만성하부호흡기질환', '결핵', '신부전', '폐렴', '패혈증', '중추신경계 염증성질환', '파킨슨병', '다발경화증', '자율신경계통장애', '대동맥류', '폐질환', '급성췌장염', '췌장질환'],
    diseaseCodes: ['E10-E14', 'I10-I15', 'B15-B19', 'K70-K77', 'K25-K27', 'I70', 'J40-J46', 'A15-A19', 'N17-N19', 'J12-J18', 'A40-A41', 'G00-G09', 'G20-G21', 'G35', 'G90', 'I71-I72', 'J43-J94', 'K85-K87'],
    baseAmount: 1000,
  },
  {
    company: '롯데손해보험',
    productName: '142대 수술비',
    groupName: '23대 특정질병',
    keywords: ['부갑상선질환', '근육장애', '발바닥근막염', '특정누적외상성질환', '윤활막힘줄장애', '식도질환', '위십이지장질환', '어깨병변', '용혈요독증후군', '비장질환', '뇌하수체질환', '대사장애', '마비', '동맥및세동맥질환', '외부요인 폐질환', '피부증', '특정호흡기질환', '침샘질환', '위공장궤양', '위십이지장 기타질환', '장흡수장애', '전신결합조직장애', '귀의 기타장애'],
    diseaseCodes: ['E20-E21', 'M60-M63', 'M72.2', 'M35', 'M65-M68', 'K20-K31', 'M75', 'D59.3', 'D73', 'E22-E27', 'G81-G83', 'I74-I77', 'J60-J70', 'J81-J84', 'K11', 'K28', 'K31', 'K90', 'M30-M31', 'H90-H95'],
    baseAmount: 200,
  },
  {
    company: '롯데손해보험',
    productName: '142대 수술비',
    groupName: '4대 특정질병',
    keywords: ['관절염', '백내장', '녹내장', '생식기질환'],
    diseaseCodes: ['M00-M25', 'H25-H27', 'H40-H42', 'N40-N99'],
    baseAmount: 20,
  },
  {
    company: '롯데손해보험',
    productName: '142대 수술비',
    groupName: '28대 특정질병',
    keywords: ['충수질환', '크로이츠펠트-야콥병', '조로증', '등통증', '기관지폐 악성신생물', '난소 악성신생물', '간담관 악성신생물', '위 악성신생물', '갑상선 악성신생물', '인플루엔자', '상세불명의 급성하기도감염', '성인호흡곤란증후군', '호흡계통 기타질환', '안구질환', '안과질환', '식도정맥류', '수면무호흡증', '결막장애', '외이질환', '림프절염', '대상포진', '급성기관지염', '급성세기관지염', '정맥염혈전정맥염', '정맥색전증혈전증'],
    diseaseCodes: ['K35-K38', 'A81.0', 'E34.8', 'M54', 'C34', 'C56', 'C22', 'C16', 'C73', 'J09-J11', 'J22', 'J80', 'J95-J99', 'H00-H59.8', 'I85', 'G47.3', 'H10-H13', 'H60-H62', 'I88-I89', 'B02', 'J20-J21', 'I80-I82'],
    baseAmount: 40,
  },
  {
    company: '롯데손해보험',
    productName: '142대 수술비',
    groupName: '29대 특정질병',
    keywords: ['뇌전증', '뇌성마비', '수두증', '버거씨병', '눈및부속기 양성신생물', '중증근무력증', '안와장애', '유리체장애', '하지정맥류', '과민대장증후군', '전신결합조직장애', '골수염', '골괴사', '뼈의 파젯병', '뼈의 기타장애', '연골병증', '신장요관결석', '요도결석증', '다한증', '수면무호흡', '결막장애', '외이질환', '림프절염', '대상포진', '급성기관지염', '급성세기관지염', '정맥염', '식도정맥류'],
    diseaseCodes: ['G40-G41', 'G80', 'G91', 'I73.1', 'D31', 'G70', 'H05', 'H43', 'I83', 'K58', 'M32-M34', 'M86-M89', 'M91-M94', 'N20-N22', 'R61', 'G47.3', 'H10-H13', 'H60-H62', 'I88-I89', 'B02', 'J20-J21', 'I80-I85'],
    baseAmount: 20,
  },
  {
    company: '롯데손해보험',
    productName: '142대 수술비',
    groupName: '39대 특정질병',
    keywords: ['담석증', '사타구니탈장', '편도염', '축농증', '황반변성', '급성상기도감염', '담낭담도질환', '중이및유돌질환', '내이질환', '소화계통 양성신생물', '흉곽내기관 양성신생물', '조직양성신생물', '수막 양성신생물', '뇌및중추신경계 양성신생물', '갑상선내분비 양성신생물', '유방양성신생물', '골다공증', '여성생식기관 양성종양', '남성생식기관 양성종양', '비뇨기관 양성신생물', '후각특정질환', '사구체질환', '신세뇨관간질질환', '방광결석', '신장요관 기타질환', '신장요관 기능장애', '비뇨계통 기타질환', '유방장애', '특정부위탈장', '비감염성장염결장염', '특정장질환', '복막질환', '척추변형', '척추병증', '추간판장애', '안면신경장애', '인후부위특정질환', '눈및부속기특정질환', '단일신경병증', '갑상선질환'],
    diseaseCodes: ['K80-K83', 'K40-K46', 'J35', 'J32', 'H35.3', 'J00-J06', 'H65-H83', 'D13-D35', 'M80-M84', 'N00-N39', 'N60-N64', 'K50-K67', 'M40-M51', 'G50-G59', 'J36-J39', 'H15-H59.8', 'E00-E07', 'H06.2', 'E89.0'],
    baseAmount: 100,
  },
  {
    company: '롯데손해보험',
    productName: '142대 수술비',
    groupName: '갑상선질환',
    keywords: ['갑상선질환'],
    diseaseCodes: ['E00-E07', 'H06.2', 'E89.0'],
    baseAmount: 100,
  },
  {
    company: '롯데손해보험',
    productName: '2대질환/2대질병수술비',
    groupName: '2대질환',
    keywords: ['요실금질환', '치핵', '치열', '치루'],
    diseaseCodes: ['R32', 'N39.3', 'N39.4', 'K60-K64'],
    baseAmount: 20,
  },
  {
    company: '롯데손해보험',
    productName: '2대질환/2대질병수술비',
    groupName: '2대질병',
    keywords: ['심장질환', '뇌혈관질환'],
    diseaseCodes: ['I00-I52', 'I60-I69'],
    baseAmount: 2000,
  },
  {
    company: 'ABL생명',
    productName: 'N대 질병수술비',
    groupName: '회사별 이미지 자료 확인',
    keywords: [...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords],
    note: '로컬 폴더 이미지 기준. 세부 그룹/한도는 원자료 대조 필요.',
  },
]

export const N_SURGERY_COMPANIES = Array.from(
  new Set(N_SURGERY_COVERAGES.map(coverage => coverage.company))
).sort((a, b) => a.localeCompare(b, 'ko-KR'))

export const N_SURGERY_BODY_PARTS = [
  { key: 'heart', label: '심장', terms: ['심장', '심근경색', '협심증', '허혈성', '관동맥', '대동맥'] },
  { key: 'brain', label: '뇌', terms: ['뇌', '뇌혈관', '뇌전증', '파킨슨', '수두증'] },
  { key: 'digestive', label: '소화기', terms: ['위', '십이지장', '담낭', '담도', '췌장', '충수', '탈장', '식도', '치핵', '치루', '복막'] },
  { key: 'urinary', label: '비뇨/생식기', terms: ['신장', '방광', '요관', '요도', '전립선', '자궁', '난소', '고환', '생식기'] },
  { key: 'eyeEar', label: '눈/귀', terms: ['백내장', '녹내장', '망막', '안구', '안와', '유리체', '중이', '내이', '고막'] },
  { key: 'spineJoint', label: '관절/척추', terms: ['관절', '척추', '추간판', '디스크', '골다공증', '골수염', '근육', '인대', '연골'] },
  { key: 'endocrine', label: '내분비', terms: ['갑상선', '부갑상선', '부신'] },
] as const

export type NSurgeryBodyPartKey = typeof N_SURGERY_BODY_PARTS[number]['key']

function normalize(text: string) {
  return text.replace(/\s/g, '').toLowerCase()
}

function normalizeCode(code: string) {
  return code.toUpperCase().replace(/\s/g, '')
}

function compactCode(code: string) {
  return normalizeCode(code).replace('.', '')
}

function codeMatchesPattern(itemCode: string, pattern: string) {
  const normalizedItem = normalizeCode(itemCode)
  const normalizedPattern = normalizeCode(pattern)

  if (!normalizedPattern.includes('-')) {
    return normalizedItem === normalizedPattern || normalizedItem.startsWith(`${normalizedPattern}.`)
  }

  const [start, end] = normalizedPattern.split('-')
  if (!start || !end || start[0] !== end[0] || normalizedItem[0] !== start[0]) return false

  const compactItem = compactCode(normalizedItem)
  const compactStart = compactCode(start)
  const compactEnd = compactCode(end)
  return compactItem >= compactStart && compactItem <= compactEnd
}

function itemMatchesDiseaseCode(item: SurgeryItem, pattern: string) {
  return item.kcd_codes.some(code => codeMatchesPattern(code, pattern))
}

export function getCoverageBodyParts(coverage: NSurgeryCoverage): string[] {
  const haystack = normalize([...coverage.keywords, coverage.groupName, coverage.productName, ...(coverage.bodyParts ?? [])].join(' '))
  return N_SURGERY_BODY_PARTS
    .filter(part => part.terms.some(term => haystack.includes(normalize(term))))
    .map(part => part.key)
}

export function getCoverageDisplayAmount(coverage: NSurgeryCoverage, fallbackAmount: number) {
  return coverage.baseAmount ?? fallbackAmount
}

function isColonPolypSearch(itemHaystack: string, query?: string) {
  if (!query) return false
  const q = normalize(query)
  const isPolypQuery = ['대장용종', '용종', '폴립', 'polyp', 'k63.5'].some(keyword => q.includes(normalize(keyword)))
  const isPolypItem = ['대장용종', 'k63.5', 'polyp'].some(keyword => itemHaystack.includes(normalize(keyword)))
  return isPolypQuery && isPolypItem
}

export function findNSurgeryCoverages(item: SurgeryItem, query?: string): NSurgeryCoverage[] {
  const haystack = normalize([
    item.name,
    item.category,
    item.notes ?? '',
    ...item.kcd_codes,
    ...item.synonyms,
  ].join(' '))

  if (isColonPolypSearch(haystack, query)) return []

  return N_SURGERY_COVERAGES.filter(coverage =>
    coverage.keywords.some(keyword => haystack.includes(normalize(keyword))) ||
    coverage.diseaseCodes?.some(code => itemMatchesDiseaseCode(item, code))
  )
}

export function matchesNSurgeryText(item: SurgeryItem, query: string): boolean {
  if (!query) return false
  const q = normalize(query)
  const itemHaystack = normalize([
    item.name,
    item.category,
    item.notes ?? '',
    ...item.kcd_codes,
    ...item.synonyms,
  ].join(' '))

  return findNSurgeryCoverages(item).some(coverage => {
    const coverageMetaMatches = [coverage.company, coverage.productName, coverage.groupName, coverage.note ?? '']
      .some(value => normalize(value).includes(q))
    const itemKeywordMatches = coverage.keywords
      .some(keyword => itemHaystack.includes(normalize(keyword)) && normalize(keyword).includes(q))
    const itemCodeMatches = coverage.diseaseCodes
      ?.some(code =>
        itemMatchesDiseaseCode(item, code) &&
        (normalize(code).includes(q) || item.kcd_codes.some(itemCode => normalize(itemCode).includes(q)))
      ) ?? false

    return coverageMetaMatches || itemKeywordMatches || itemCodeMatches
  })
}

export function getNSurgeryDiseaseDetailsForItem(item: SurgeryItem): NSurgeryDiseaseDetail[] {
  const itemName = item.name.toLowerCase()
  const itemSynonyms = item.synonyms.map(s => s.toLowerCase())

  return N_SURGERY_DISEASE_DETAILS.filter(detail => {
    const codeMatch = item.kcd_codes.some(code => codeMatchesPattern(code, detail.code))
    const aliasMatch = detail.aliases?.some(alias =>
      itemName.includes(alias.toLowerCase()) ||
      itemSynonyms.some(s => s.includes(alias.toLowerCase()))
    ) ?? false
    return codeMatch || aliasMatch
  })
}
